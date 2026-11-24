from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api import auth

REGISTRATION = {
    "name": "Traffic Analyst",
    "email": "analyst@example.test",
    "password": "a-long-local-test-passphrase",
}


@pytest.fixture
def client(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(auth, "auth_store", auth.AccountStore(tmp_path / "accounts.sqlite3"))
    monkeypatch.setattr(auth, "attempt_limiter", auth.AttemptLimiter())
    monkeypatch.delenv("FLOWCAST_COOKIE_SECURE", raising=False)
    application = FastAPI()
    application.include_router(auth.router)
    with TestClient(application) as test_client:
        yield test_client


def test_registration_cookie_and_logout_lifecycle(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").json() == {"user": None}
    response = client.post("/api/v1/auth/register", json=REGISTRATION)
    assert response.status_code == 201
    user = response.json()["user"]
    assert user["email"] == REGISTRATION["email"]
    assert set(user) == {"id", "name", "email"}
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=strict" in response.headers["set-cookie"].lower()
    assert client.get("/api/v1/auth/me").json()["user"] == user
    assert client.post("/api/v1/auth/logout").json() == {"user": None}
    assert client.get("/api/v1/auth/me").json() == {"user": None}


def test_login_checks_password_and_creates_new_session(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=REGISTRATION)
    first_cookie = client.cookies[auth.COOKIE_NAME]
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": REGISTRATION["email"], "password": "wrong-password"},
    )
    assert bad_login.status_code == 401
    assert bad_login.json()["detail"] == "Email or password is incorrect."
    login = client.post("/api/v1/auth/login", json=REGISTRATION)
    assert login.status_code == 200
    assert client.cookies[auth.COOKIE_NAME] != first_cookie
    assert auth.auth_store.current_user(first_cookie) is None


def test_email_is_normalized_and_duplicate_accounts_rejected(client: TestClient) -> None:
    payload = {**REGISTRATION, "email": "  Analyst@Example.Test  "}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=REGISTRATION).status_code == 409


def test_passwords_and_session_tokens_are_not_stored_in_plaintext(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=REGISTRATION)
    with sqlite3.connect(auth.auth_store.path) as connection:
        user = connection.execute("SELECT password_hash, salt FROM users").fetchone()
        session = connection.execute("SELECT token_hash FROM sessions").fetchone()
    assert len(user[0]) == 32
    assert len(user[1]) == 16
    assert session[0] != client.cookies[auth.COOKIE_NAME]
    assert REGISTRATION["password"].encode() not in auth.auth_store.path.read_bytes()


def test_expired_session_does_not_authenticate(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=REGISTRATION)
    with sqlite3.connect(auth.auth_store.path) as connection:
        connection.execute("UPDATE sessions SET expires_at = 0")
        connection.commit()
    assert client.get("/api/v1/auth/me").json() == {"user": None}


@pytest.mark.parametrize(
    "field,value", [("password", "short"), ("name", "  "), ("email", "invalid")]
)
def test_registration_rejects_invalid_input(client: TestClient, field: str, value: str) -> None:
    assert client.post(
        "/api/v1/auth/register", json={**REGISTRATION, field: value}
    ).status_code == 422


def test_validation_errors_never_echo_a_password(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register", json={**REGISTRATION, "password": "tiny-secret" * 20}
    )
    assert response.status_code == 422
    assert "tiny-secret" not in response.text
    assert all("input" not in error for error in response.json()["detail"])


def test_auth_attempts_are_throttled(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(auth, "attempt_limiter", auth.AttemptLimiter(limit=2))
    for _ in range(2):
        assert client.post("/api/v1/auth/login", json=REGISTRATION).status_code == 401
    blocked = client.post("/api/v1/auth/login", json=REGISTRATION)
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0


def test_cross_origin_session_changes_are_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json=REGISTRATION,
        headers={"Origin": "https://unrelated.example"},
    )
    assert response.status_code == 403


def test_secure_cookie_can_be_enabled(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("FLOWCAST_COOKIE_SECURE", "true")
    response = client.post("/api/v1/auth/register", json=REGISTRATION)
    assert "; Secure" in response.headers["set-cookie"]
