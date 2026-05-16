-- Migration: 002_auth_tables
-- OTP sessions and user accounts for login flow

CREATE TABLE IF NOT EXISTS otp_sessions (
  id         SERIAL PRIMARY KEY,
  identifier TEXT        NOT NULL,        -- email or phone
  otp_hash   TEXT        NOT NULL,        -- PBKDF2-SHA256 hash
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_identifier ON otp_sessions (identifier);

CREATE TABLE IF NOT EXISTS user_sessions (
  token      TEXT        PRIMARY KEY,     -- JWT or opaque token
  identifier TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_identifier ON user_sessions (identifier);

-- Cleanup old rows automatically (requires pg_cron or manual job)
-- DELETE FROM otp_sessions WHERE expires_at < NOW() - INTERVAL '1 day';
-- DELETE FROM user_sessions WHERE expires_at < NOW();

INSERT INTO schema_migrations (version, description) VALUES (2, 'auth_tables')
  ON CONFLICT (version) DO NOTHING;
