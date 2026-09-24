-- Purpose: rebuild insight detection as a batch SQL scan (replacing per-row JS rule checks run
--          during import); add structured metadata and a savings estimate so the new agentic
--          drafting step can read facts instead of parsing the rendered body string, and fix
--          HIGH_SPENDING insights never being dedup-protected (a NULL subscription_id never
--          collides in a unique index).
-- Date: 2026-09-06

TRUNCATE TABLE insights;

ALTER TABLE insights ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE insights ADD COLUMN estimated_monthly_savings DECIMAL(12,2) NULL;

DROP INDEX IF EXISTS idx_insights_unread_dedupe;

CREATE UNIQUE INDEX idx_insights_unread_dedupe_subscription ON insights (user_id, subscription_id, type)
  WHERE status = 'UNREAD' AND subscription_id IS NOT NULL;
CREATE UNIQUE INDEX idx_insights_unread_dedupe_transaction ON insights (user_id, transaction_id, type)
  WHERE status = 'UNREAD' AND transaction_id IS NOT NULL;
