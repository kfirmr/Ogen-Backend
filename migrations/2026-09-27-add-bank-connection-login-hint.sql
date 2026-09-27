-- Purpose: keep non-secret fragments of a bank login (card last 4, ID last 3, username first 2)
--          so the app can show which account is connected without decrypting credentials.
-- Date: 2026-09-27

ALTER TABLE bank_connections ADD COLUMN login_hint JSONB NULL;
