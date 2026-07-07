-- Migration 006: hdi_claims table
-- Moved out of api/claim.js where it was running CREATE TABLE on every POST request.

CREATE TABLE IF NOT EXISTS hdi_claims (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id       VARCHAR(100),
  infringing_url   TEXT         NOT NULL,
  platform         VARCHAR(100),
  violation_type   VARCHAR(50),
  reporter_name    VARCHAR(200),
  reporter_email   TEXT         NOT NULL,
  reporter_contact TEXT,
  dmca_text        TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'open',
  submitted_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hdi_claims_license    ON hdi_claims (license_id);
CREATE INDEX IF NOT EXISTS idx_hdi_claims_submitted  ON hdi_claims (submitted_at DESC);

INSERT INTO schema_migrations (version, description)
VALUES (6, 'hdi_claims')
ON CONFLICT (version) DO NOTHING;
