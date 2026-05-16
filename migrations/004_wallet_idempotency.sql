-- Migration: 004_wallet_idempotency
-- Adds request_id (idempotency key) to hi_transactions so that
-- retried POST /api/wallet/transactions calls are safe and cannot double-spend.
-- ON CONFLICT (request_id) DO NOTHING returns the existing row on replay.

ALTER TABLE hi_transactions
  ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Unique index only on non-null request_ids (client-supplied idempotency keys).
-- Transactions without a request_id are allowed to be duplicated (legacy/internal).
CREATE UNIQUE INDEX IF NOT EXISTS idx_hi_transactions_request_id
  ON hi_transactions (request_id)
  WHERE request_id IS NOT NULL;

INSERT INTO schema_migrations (version, description) VALUES (4, 'wallet_idempotency')
  ON CONFLICT (version) DO NOTHING;
