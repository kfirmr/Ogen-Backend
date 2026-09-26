-- Purpose: replace the XLSX statement upload with automated bank scraping. bank_connections holds
--          each user's encrypted bank / card login (AES-256-GCM, never plaintext) and the state
--          of its nightly sync, including the SMS-code handoff; statement_imports records which
--          connection produced each sync. oneZero is the only company whose scraper accepts an SMS
--          code mid-login, so it is the one that can pause for AWAITING_OTP today.
-- Date: 2026-09-26

CREATE TYPE bank_company AS ENUM (
  'max', 'leumi', 'yahav', 'union', 'massad', 'pagi', 'amex', 'mizrahi', 'oneZero', 'discount',
  'hapoalim', 'isracard', 'visaCal', 'beinleumi', 'behatsdaa', 'mercantile', 'otsarHahayal',
  'beyahadBishvilha'
);

CREATE TYPE bank_connection_status AS ENUM (
  'ACTIVE', 'FAILED', 'SYNCING', 'AWAITING_OTP', 'PENDING_VALIDATION', 'INVALID_CREDENTIALS'
);

CREATE TABLE bank_connections (
  id                    UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID                   NOT NULL REFERENCES users (id),
  company               bank_company           NOT NULL,
  status                bank_connection_status NOT NULL DEFAULT 'PENDING_VALIDATION',
  encrypted_credentials TEXT                   NOT NULL,
  encrypted_otp_code    TEXT                   NULL,
  otp_requested_at      TIMESTAMPTZ            NULL,
  last_attempted_at     TIMESTAMPTZ            NULL,
  last_synced_at        TIMESTAMPTZ            NULL,
  last_error            TEXT                   NULL,
  created_at            TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_connections_status ON bank_connections (status);
CREATE UNIQUE INDEX idx_bank_connections_user_company ON bank_connections (user_id, company);

-- Removing a connection must not erase the history it imported, only the link to it.
ALTER TABLE statement_imports
  ADD COLUMN bank_connection_id UUID NULL REFERENCES bank_connections (id) ON DELETE SET NULL;
