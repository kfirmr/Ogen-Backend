-- Purpose: create the core Ogen schema backing the subscription and expense MVP.
-- Date: 2026-08-24

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE vendor_category AS ENUM (
  'COMMUNICATION', 'INSURANCE', 'STREAMING', 'UTILITIES', 'FITNESS', 'SOFTWARE', 'OTHER'
);

CREATE TYPE billing_cycle AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELLATION_REQUESTED', 'CANCELLED');

CREATE TYPE alert_type AS ENUM ('OVERPAYING', 'DUPLICATE');

CREATE TYPE alert_status AS ENUM ('UNREAD', 'READ', 'ACTION_TAKEN');

CREATE TYPE import_source AS ENUM ('CSV', 'BANK_API', 'MANUAL');

CREATE TYPE import_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Partial so a soft-deleted account releases its email for re-registration.
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users (deleted_at);

CREATE TABLE vendors (
  id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255)    NOT NULL UNIQUE,
  cancellation_email   VARCHAR(255),
  average_market_price NUMERIC(12, 2),
  currency             CHAR(3)         NOT NULL DEFAULT 'ILS',
  category             VENDOR_CATEGORY,
  created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_aliases (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID         NOT NULL REFERENCES vendors (id) ON DELETE CASCADE,
  pattern    VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_aliases_vendor ON vendor_aliases (vendor_id);

CREATE TABLE statement_imports (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users (id),
  source            IMPORT_SOURCE NOT NULL DEFAULT 'CSV',
  status            IMPORT_STATUS NOT NULL DEFAULT 'PENDING',
  filename          VARCHAR(255),
  transaction_count INTEGER       NOT NULL DEFAULT 0,
  error_message     TEXT,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_statement_imports_user_created ON statement_imports (user_id, created_at);

CREATE TABLE subscriptions (
  id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID                NOT NULL REFERENCES users (id),
  vendor_id                 UUID                REFERENCES vendors (id),
  amount                    NUMERIC(12, 2)      NOT NULL,
  currency                  CHAR(3)             NOT NULL DEFAULT 'ILS',
  billing_cycle             BILLING_CYCLE       NOT NULL DEFAULT 'MONTHLY',
  status                    SUBSCRIPTION_STATUS NOT NULL DEFAULT 'ACTIVE',
  next_charge_date          DATE,
  cancellation_requested_at TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

-- No unique (user_id, vendor_id): duplicate active subscriptions are the DUPLICATE alert signal.
CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX idx_subscriptions_vendor ON subscriptions (vendor_id);

CREATE TABLE transactions (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID           NOT NULL REFERENCES users (id),
  vendor_id            UUID           REFERENCES vendors (id),
  subscription_id      UUID           REFERENCES subscriptions (id),
  import_id            UUID           REFERENCES statement_imports (id),
  external_id          VARCHAR(255),
  original_description VARCHAR(512)   NOT NULL,
  amount               NUMERIC(12, 2) NOT NULL,
  currency             CHAR(3)        NOT NULL DEFAULT 'ILS',
  transaction_date     DATE           NOT NULL,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

-- Makes re-running a bank/CSV import idempotent whenever the source supplies an identifier.
CREATE UNIQUE INDEX idx_transactions_external_id
  ON transactions (user_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_transactions_user_date ON transactions (user_id, transaction_date);
CREATE INDEX idx_transactions_user_subscription ON transactions (user_id, subscription_id);
CREATE INDEX idx_transactions_dedupe_lookup ON transactions (user_id, transaction_date, amount);

-- Undoing an import is a soft delete of every row carrying its id.
CREATE INDEX idx_transactions_import ON transactions (import_id);

CREATE TABLE alerts (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users (id),
  subscription_id UUID         REFERENCES subscriptions (id),
  transaction_id  UUID         REFERENCES transactions (id),
  type            ALERT_TYPE   NOT NULL,
  body            TEXT         NOT NULL,
  status          ALERT_STATUS NOT NULL DEFAULT 'UNREAD',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_status ON alerts (user_id, status);

-- Re-running detection cannot stack a second unread alert of the same type on one subscription.
CREATE UNIQUE INDEX idx_alerts_unread_dedupe
  ON alerts (user_id, subscription_id, type)
  WHERE status = 'UNREAD';
