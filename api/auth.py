"""Local workspace accounts and opaque, cookie-backed sessions.

Historical traffic endpoints remain public for the demo. These accounts identify
workspace users; they do not claim email ownership verification or external SSO.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Awaitable, Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel, Field, SecretStr, field_validator

ROOT = Path(__file__).resolve().parents[1]
COOKIE_NAME = "flowcast_session"
SESSION_SECONDS = 7 * 24 * 60 * 60
SCRYPT_N = 2**14


class RedactedValidationRoute(APIRoute):
    """Keep credentials out of validation error responses and error logging."""

    def get_route_handler(self) -> Callable[[Request], Awaitable[Response]]:
        handler = super().get_route_handler()

        async def handle(request: Request) -> Response:
            try:
                return await handler(request)
            except RequestValidationError as exc:
                errors = [
                    {key: error[key] for key in ("type", "loc", "msg")}
                    for error in exc.errors()
                ]
                return JSONResponse(
                    status_code=422,
                    content={"detail": errors},
                    headers={"Cache-Control": "no-store"},
                )

        return handle


router = APIRouter(
    prefix="/api/v1/auth", tags=["Workspace accounts"], route_class=RedactedValidationRoute
)


class User(BaseModel):
    id: str
    name: str
    email: str


class SessionResponse(BaseModel):
    user: User | None


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: SecretStr

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("password")
    @classmethod
    def bounded_password(cls, value: SecretStr) -> SecretStr:
        if not 1 <= len(value.get_secret_value()) <= 128:
            raise ValueError("Password must contain between 1 and 128 characters")
        return value


class RegisterRequest(LoginRequest):
    name: str = Field(min_length=2, max_length=80)

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2 or any(ord(char) < 32 for char in value):
            raise ValueError("Enter a name with at least two characters")
        return normalized

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 10:
            raise ValueError("Use at least 10 characters for your password")
        return value


def password_digest(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=8, p=1, dklen=32
    )


def session_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AttemptLimiter:
    """Bounded, process-local throttling for this local account service."""

    def __init__(self, limit: int = 10, window: int = 300, max_clients: int = 4096) -> None:
        self.limit = limit
        self.window = window
        self.max_clients = max_clients
        self.attempts: OrderedDict[str, deque[float]] = OrderedDict()
        self.lock = threading.Lock()

    def check(self, client: str) -> None:
        now = time.monotonic()
        with self.lock:
            entries = self.attempts.setdefault(client, deque())
            while entries and entries[0] <= now - self.window:
                entries.popleft()
            self.attempts.move_to_end(client)
            while len(self.attempts) > self.max_clients:
                self.attempts.popitem(last=False)
            if len(entries) >= self.limit:
                retry_after = max(1, int(self.window - (now - entries[0])) + 1)
                raise HTTPException(
                    status_code=429,
                    detail="Too many account attempts. Please try again in a few minutes.",
                    headers={"Retry-After": str(retry_after)},
                )
            entries.append(now)


class AccountStore:
    def __init__(self, path: Path | None = None) -> None:
        configured = os.getenv("FLOWCAST_AUTH_DB")
        default_path = ROOT / "artifacts" / "accounts.sqlite3"
        self.path = path or (Path(configured) if configured else default_path)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            connection.execute("PRAGMA foreign_keys = ON")
            connection.executescript(
                """
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
                """
            )
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def register(self, payload: RegisterRequest) -> User:
        user = User(id=secrets.token_hex(16), name=payload.name, email=payload.email)
        salt = secrets.token_bytes(16)
        digest = password_digest(payload.password.get_secret_value(), salt)
        try:
            with self.connection() as connection:
                connection.execute(
                    "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)",
                    (user.id, user.name, user.email, salt, digest, time.time()),
                )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status_code=409,
                detail="An account already uses this email. Sign in instead.",
            ) from exc
        return user

    def authenticate(self, payload: LoginRequest) -> User:
        with self.connection() as connection:
            record = connection.execute(
                "SELECT * FROM users WHERE email = ?", (payload.email,)
            ).fetchone()
        # Run the same expensive operation for unknown and known email addresses.
        salt = record["salt"] if record else bytes(16)
        digest = password_digest(payload.password.get_secret_value(), salt)
        expected = record["password_hash"] if record else bytes(32)
        if not hmac.compare_digest(digest, expected) or record is None:
            raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        return User(id=record["id"], name=record["name"], email=record["email"])

    def create_session(self, user: User, old_token: str | None) -> str:
        token = secrets.token_urlsafe(32)
        with self.connection() as connection:
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (time.time(),))
            if old_token:
                connection.execute(
                    "DELETE FROM sessions WHERE token_hash = ?", (session_digest(old_token),)
                )
            connection.execute(
                "INSERT INTO sessions VALUES (?, ?, ?)",
                (session_digest(token), user.id, time.time() + SESSION_SECONDS),
            )
        return token

    def current_user(self, token: str | None) -> User | None:
        if not token or len(token) > 128:
            return None
        with self.connection() as connection:
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (time.time(),))
            record = connection.execute(
                "SELECT u.id, u.name, u.email FROM users u "
                "JOIN sessions s ON s.user_id = u.id "
                "WHERE s.token_hash = ? AND s.expires_at > ?",
                (session_digest(token), time.time()),
            ).fetchone()
        return User(**dict(record)) if record else None

    def logout(self, token: str | None) -> None:
        if token and len(token) <= 128:
            with self.connection() as connection:
                connection.execute(
                    "DELETE FROM sessions WHERE token_hash = ?", (session_digest(token),)
                )


auth_store = AccountStore()
attempt_limiter = AttemptLimiter()


def check_origin(request: Request) -> None:
    """Reject browser mutations from unrelated origins, including login CSRF."""
    origin = request.headers.get("origin")
    if origin is None:
        return
    parsed = urlsplit(str(request.base_url))
    same_origin = f"{parsed.scheme}://{parsed.netloc}"
    configured = os.getenv(
        "FLOWCAST_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    allowed = {entry.strip().rstrip("/") for entry in configured.split(",") if entry.strip()}
    if origin.rstrip("/") not in allowed | {same_origin}:
        raise HTTPException(status_code=403, detail="This origin cannot change your session.")


def set_session(response: Response, request: Request, user: User) -> None:
    token = auth_store.create_session(user, request.cookies.get(COOKIE_NAME))
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_SECONDS,
        httponly=True,
        secure=os.getenv("FLOWCAST_COOKIE_SECURE", "false").lower() == "true",
        samesite="strict",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"


def prepare_mutation(request: Request, *, throttle: bool = True) -> None:
    check_origin(request)
    if throttle:
        # Do not trust forwarded headers from unconfigured proxies.
        attempt_limiter.check(request.client.host if request.client else "unknown")


@router.post("/register", response_model=SessionResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, response: Response) -> SessionResponse:
    prepare_mutation(request)
    try:
        user = auth_store.register(payload)
        set_session(response, request, user)
    except sqlite3.Error as exc:
        raise HTTPException(503, "Account storage is temporarily unavailable.") from exc
    return SessionResponse(user=user)


@router.post("/login", response_model=SessionResponse)
def login(payload: LoginRequest, request: Request, response: Response) -> SessionResponse:
    prepare_mutation(request)
    try:
        user = auth_store.authenticate(payload)
        set_session(response, request, user)
    except sqlite3.Error as exc:
        raise HTTPException(503, "Account storage is temporarily unavailable.") from exc
    return SessionResponse(user=user)


@router.get("/me", response_model=SessionResponse)
def me(request: Request, response: Response) -> SessionResponse:
    response.headers["Cache-Control"] = "no-store"
    try:
        return SessionResponse(user=auth_store.current_user(request.cookies.get(COOKIE_NAME)))
    except sqlite3.Error as exc:
        raise HTTPException(503, "Account storage is temporarily unavailable.") from exc


@router.post("/logout", response_model=SessionResponse)
def logout(request: Request, response: Response) -> SessionResponse:
    prepare_mutation(request, throttle=False)
    try:
        auth_store.logout(request.cookies.get(COOKIE_NAME))
    except sqlite3.Error as exc:
        raise HTTPException(503, "Account storage is temporarily unavailable.") from exc
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, samesite="strict")
    response.headers["Cache-Control"] = "no-store"
    return SessionResponse(user=None)
