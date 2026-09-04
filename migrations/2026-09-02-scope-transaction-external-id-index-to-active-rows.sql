-- Purpose: exclude soft-deleted transactions from the external_id uniqueness check, so
-- undoing an import (or re-uploading the same statement) doesn't collide with rows that
-- were only soft-deleted.
-- Date: 2026-09-02

DROP INDEX IF EXISTS idx_transactions_external_id;

CREATE UNIQUE INDEX idx_transactions_external_id
  ON transactions (user_id, external_id)
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;
