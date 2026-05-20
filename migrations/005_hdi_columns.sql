-- Migration 005: Add perceptual_hash to hdi_licenses, create hi_repost_alerts
-- and hi_social_verifications so API hot paths never run ALTER/CREATE TABLE.

ALTER TABLE hdi_licenses
  ADD COLUMN IF NOT EXISTS perceptual_hash TEXT;

CREATE TABLE IF NOT EXISTS hi_repost_alerts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id     TEXT,
  infringing_url TEXT        NOT NULL,
  platform       TEXT,
  confidence     INTEGER     DEFAULT 0,
  detected_by    TEXT        DEFAULT 'community',
  status         TEXT        DEFAULT 'new',
  reporter_note  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repost_alerts_created ON hi_repost_alerts(created_at DESC);

CREATE TABLE IF NOT EXISTS hi_social_verifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT        NOT NULL,
  profile_url  TEXT        NOT NULL,
  verify_code  TEXT        NOT NULL,
  status       TEXT        DEFAULT 'pending',
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_social_verif_created ON hi_social_verifications(created_at DESC);

INSERT INTO schema_migrations (version, description)
VALUES (5, 'hdi_columns')
ON CONFLICT (version) DO NOTHING;
