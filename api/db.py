"""Environment loading, database backend adapter, and scenario log persistence."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "db" / "schema.sql"
DEFAULT_SQLITE_PATH = ROOT / "artifacts" / "accounts.sqlite3"
POSTGRES_SCHEMES = ("postgresql://", "postgres://")

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    salt BLOB NOT NULL,
    password_hash BLOB NOT NULL,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS scenario_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_version TEXT NOT NULL,
    overrides_json TEXT NOT NULL,
    baseline_prediction REAL NOT NULL,
    scenario_prediction REAL NOT NULL,
    difference REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS scenario_logs_created_at_idx ON scenario_logs(created_at DESC);
"""


class StorageUnavailableError(Exception):
    """Raised when database storage fails without exposing connection strings."""


class DuplicateKeyError(Exception):
    """Raised when inserting a record violates a unique constraint."""


def load_local_env() -> None:
    """Load local .env at runtime while keeping pytest runs isolated."""
    if os.getenv("PYTEST_CURRENT_TEST"):
        return
    if os.getenv("FLOWCAST_DISABLE_DOTENV", "").lower() == "true":
        return
    env_file = ROOT / ".env"
    if env_file.is_file():
        load_dotenv(env_file, override=False)


def resolve_database_url(database_url: str | None = None) -> str | None:
    """Return a validated Postgres connection string when set, else None."""
    raw = (database_url if database_url is not None else os.getenv("DATABASE_URL", "")).strip()
    if not raw:
        return None
    if not raw.startswith(POSTGRES_SCHEMES):
        raise ValueError("DATABASE_URL must start with postgresql:// or postgres://")
    return raw


def _postgres_connect_kwargs(database_url: str) -> dict[str, Any]:
    parsed = urlsplit(database_url)
    kwargs: dict[str, Any] = {"connect_timeout": 10, "row_factory": dict_row}
    if "sslmode=" not in parsed.query and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        kwargs["sslmode"] = "require"
    return kwargs


def _sql_statements(script: str) -> list[str]:
    lines = [line for line in script.splitlines() if not line.lstrip().startswith("--")]
    return [stmt.strip() for stmt in "\n".join(lines).split(";") if stmt.strip()]


class DatabaseSession:
    """Uniform parameterized query wrapper for SQLite and PostgreSQL."""

    def __init__(self, connection: Any, *, is_postgres: bool) -> None:
        self._conn = connection
        self._is_postgres = is_postgres

    def _prepare(self, query: str) -> str:
        return query.replace("?", "%s") if self._is_postgres else query

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        prepared = self._prepare(query)
        if self._is_postgres:
            with self._conn.cursor() as cur:
                cur.execute(prepared, params)
        else:
            self._conn.execute(prepared, params)

    def fetchone(self, query: str, params: tuple[Any, ...] = ()) -> Mapping[str, Any] | None:
        prepared = self._prepare(query)
        if self._is_postgres:
            with self._conn.cursor() as cur:
                cur.execute(prepared, params)
                return cur.fetchone()
        return self._conn.execute(prepared, params).fetchone()

    def fetchall(self, query: str, params: tuple[Any, ...] = ()) -> list[Mapping[str, Any]]:
        prepared = self._prepare(query)
        if self._is_postgres:
            with self._conn.cursor() as cur:
                cur.execute(prepared, params)
                return list(cur.fetchall())
        return list(self._conn.execute(prepared, params).fetchall())


class DatabaseBackend:
    """Manages SQLite or Supabase Postgres connections and idempotent schema setup."""

    def __init__(self, path: Path | None = None, database_url: str | None = None) -> None:
        if database_url is not None:
            self.database_url = resolve_database_url(database_url)
            self.path = path or DEFAULT_SQLITE_PATH
        elif path is not None:
            self.database_url = None
            self.path = path
        else:
            self.database_url = resolve_database_url()
            configured = os.getenv("FLOWCAST_AUTH_DB")
            self.path = Path(configured) if configured else DEFAULT_SQLITE_PATH

        self.backend_name = "postgres" if self.database_url else "sqlite"
        self._schema_ready = False
        self._schema_lock = threading.Lock()

    def _ensure_postgres_schema(self, conn: psycopg.Connection[Any]) -> None:
        if self._schema_ready:
            return
        with self._schema_lock:
            if self._schema_ready:
                return
            for statement in _sql_statements(SCHEMA_PATH.read_text(encoding="utf-8")):
                with conn.cursor() as cur:
                    cur.execute(statement)
            conn.commit()
            self._schema_ready = True

    @contextmanager
    def session(self) -> Iterator[DatabaseSession]:
        if self.database_url is not None:
            try:
                conn = psycopg.connect(
                    self.database_url, **_postgres_connect_kwargs(self.database_url)
                )
            except psycopg.Error:
                raise StorageUnavailableError("Database connection failed.") from None
            try:
                self._ensure_postgres_schema(conn)
                yield DatabaseSession(conn, is_postgres=True)
                conn.commit()
            except psycopg.errors.UniqueViolation:
                conn.rollback()
                raise DuplicateKeyError("Duplicate record.") from None
            except psycopg.Error:
                conn.rollback()
                raise StorageUnavailableError("Database operation failed.") from None
            finally:
                conn.close()
            return

        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            conn_sqlite = sqlite3.connect(self.path, timeout=10)
        except sqlite3.Error:
            raise StorageUnavailableError("Local database connection failed.") from None
        conn_sqlite.row_factory = sqlite3.Row
        try:
            conn_sqlite.execute("PRAGMA foreign_keys = ON")
            conn_sqlite.executescript(SQLITE_SCHEMA)
            yield DatabaseSession(conn_sqlite, is_postgres=False)
            conn_sqlite.commit()
        except sqlite3.IntegrityError:
            conn_sqlite.rollback()
            raise DuplicateKeyError("Duplicate record.") from None
        except sqlite3.Error:
            conn_sqlite.rollback()
            raise StorageUnavailableError("Local database operation failed.") from None
        finally:
            conn_sqlite.close()


class ScenarioLogStore:
    """Stores counterfactual weather scenario runs when persistent logging is enabled."""

    def __init__(
        self, backend: DatabaseBackend | None = None, *, enabled: bool | None = None
    ) -> None:
        self.backend = backend or DatabaseBackend()
        if enabled is not None:
            self.enabled = enabled
        else:
            self.enabled = (
                self.backend.backend_name == "postgres"
                or os.getenv("FLOWCAST_LOG_SCENARIOS", "").lower() == "true"
            )

    def record(
        self,
        *,
        model_version: str,
        overrides: dict[str, float],
        baseline_prediction: float,
        scenario_prediction: float,
        difference: float,
    ) -> None:
        if not self.enabled:
            return
        with self.backend.session() as db:
            db.execute(
                "INSERT INTO scenario_logs "
                "(model_version, overrides_json, baseline_prediction, "
                "scenario_prediction, difference) VALUES (?, ?, ?, ?, ?)",
                (
                    model_version,
                    json.dumps(overrides, sort_keys=True),
                    baseline_prediction,
                    scenario_prediction,
                    difference,
                ),
            )

    def recent(self, limit: int = 10) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        with self.backend.session() as db:
            rows = db.fetchall(
                "SELECT id, model_version, overrides_json, baseline_prediction, "
                "scenario_prediction, difference, created_at "
                "FROM scenario_logs ORDER BY id DESC LIMIT ?",
                (limit,),
            )
        results: list[dict[str, Any]] = []
        for row in rows:
            raw_overrides = row["overrides_json"]
            overrides = (
                json.loads(raw_overrides) if isinstance(raw_overrides, str) else dict(raw_overrides)
            )
            results.append(
                {
                    "id": int(row["id"]),
                    "model_version": row["model_version"],
                    "overrides": overrides,
                    "baseline_prediction": float(row["baseline_prediction"]),
                    "scenario_prediction": float(row["scenario_prediction"]),
                    "difference": float(row["difference"]),
                    "created_at": str(row["created_at"]),
                }
            )
        return results
