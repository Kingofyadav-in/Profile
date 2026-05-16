-- Migration: 003_wallet_tables
-- HI Coin ledger, vault backups, marketplace listings, merchant payment requests.
-- Max supply is enforced at the API layer (MAX_SUPPLY = 99).

-- Singleton wallet balance row
CREATE TABLE IF NOT EXISTS hi_wallet (
  id             SERIAL PRIMARY KEY,
  balance        INTEGER      NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance INTEGER      NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed the singleton row if empty
INSERT INTO hi_wallet (balance) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM hi_wallet);

-- Immutable ledger (append-only) — type: mint | burn | reward | spend | transfer
CREATE TABLE IF NOT EXISTS hi_transactions (
  id          SERIAL PRIMARY KEY,
  type        TEXT         NOT NULL CHECK (type IN ('mint','burn','reward','spend','transfer')),
  amount      INTEGER      NOT NULL CHECK (amount > 0),
  description TEXT         NOT NULL DEFAULT '',
  ref_id      TEXT,                            -- optional external reference
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hi_transactions_type ON hi_transactions (type);
CREATE INDEX IF NOT EXISTS idx_hi_transactions_created ON hi_transactions (created_at DESC);

-- Encrypted vault backups (ciphertext is opaque; encryption done in browser)
CREATE TABLE IF NOT EXISTS hi_vault_backups (
  id          SERIAL PRIMARY KEY,
  label       TEXT         NOT NULL DEFAULT 'backup',
  ciphertext  TEXT         NOT NULL,            -- base64-encoded encrypted blob
  checksum    TEXT         NOT NULL DEFAULT '', -- SHA-256 of plaintext (pre-encryption)
  size_bytes  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id           SERIAL PRIMARY KEY,
  title        TEXT         NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  price_coins  INTEGER      NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  category     TEXT         NOT NULL DEFAULT 'other',
  status       TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','removed')),
  tags         JSONB        NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings (status);

-- Merchant payment requests
CREATE TABLE IF NOT EXISTS merchant_requests (
  id           SERIAL PRIMARY KEY,
  description  TEXT         NOT NULL,
  amount_coins INTEGER      NOT NULL CHECK (amount_coins > 0),
  reference    TEXT         NOT NULL DEFAULT '',  -- merchant invoice/order ref
  status       TEXT         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description) VALUES (3, 'wallet_tables')
  ON CONFLICT (version) DO NOTHING;
