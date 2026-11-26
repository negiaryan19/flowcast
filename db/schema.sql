-- FlowCast PostgreSQL / Supabase schema (Option A).
-- Safe to run repeatedly; FlowCast also applies this schema automatically on startup.

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    salt BYTEA NOT NULL,
    password_hash BYTEA NOT NULL,
    created_at DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS scenario_logs (
    id BIGSERIAL PRIMARY KEY,
    model_version TEXT NOT NULL,
    overrides_json JSONB NOT NULL,
    baseline_prediction DOUBLE PRECISION NOT NULL,
    scenario_prediction DOUBLE PRECISION NOT NULL,
    difference DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scenario_logs_created_at_idx ON scenario_logs(created_at DESC);
