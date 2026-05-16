-- Migration: 001_initial_schema
-- Creates all tables required by the HI Life OS API

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  description TEXT    NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identity (singleton row)
CREATE TABLE IF NOT EXISTS identity (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  tagline    TEXT,
  roles      JSONB    NOT NULL DEFAULT '[]',
  mission    TEXT,
  location   TEXT,
  hdi_code   TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id          SERIAL PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  frequency   TEXT        NOT NULL DEFAULT 'daily',
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id           SERIAL PRIMARY KEY,
  habit_id     INTEGER     NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_on DATE        NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (habit_id, completed_on)
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id         SERIAL PRIMARY KEY,
  title      TEXT        NOT NULL,
  body       TEXT,
  progress   INTEGER     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  deadline   DATE,
  status     TEXT        NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  title      TEXT        NOT NULL,
  body       TEXT,
  tags       JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mood Logs
CREATE TABLE IF NOT EXISTS mood_logs (
  id         SERIAL PRIMARY KEY,
  mood       INTEGER     NOT NULL CHECK (mood BETWEEN 1 AND 10),
  energy     INTEGER     NOT NULL CHECK (energy BETWEEN 1 AND 10),
  note       TEXT,
  logged_on  DATE        NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (logged_on)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id         SERIAL PRIMARY KEY,
  title      TEXT        NOT NULL,
  category   TEXT,
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  due_date   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id             SERIAL PRIMARY KEY,
  name           TEXT        NOT NULL,
  email          TEXT,
  phone          TEXT,
  company        TEXT,
  note           TEXT,
  follow_up_date DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id             SERIAL PRIMARY KEY,
  title          TEXT        NOT NULL,
  description    TEXT,
  event_date     DATE        NOT NULL,
  follow_up_date DATE,
  contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  priority    INTEGER     NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status      TEXT        NOT NULL DEFAULT 'active',
  deadline    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  due_date   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         TEXT        PRIMARY KEY,
  messages   JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HDI Licenses
CREATE TABLE IF NOT EXISTS hdi_licenses (
  id           SERIAL PRIMARY KEY,
  claim_id     TEXT        NOT NULL,
  content_hash TEXT,
  status       TEXT        NOT NULL DEFAULT 'active',
  metadata     JSONB       NOT NULL DEFAULT '{}',
  claim_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Record this migration
INSERT INTO schema_migrations (version, description) VALUES (1, 'initial_schema')
  ON CONFLICT (version) DO NOTHING;
