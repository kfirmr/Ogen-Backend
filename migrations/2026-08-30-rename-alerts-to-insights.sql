-- Purpose: rename the alerts domain to insights so the server matches the client vocabulary — these
--          rows are proactive findings we surface to the user, not warnings she has to act on.
-- Date: 2026-08-30

ALTER TABLE alerts RENAME TO insights;

ALTER TYPE alert_type RENAME TO insight_type;
ALTER TYPE alert_status RENAME TO insight_status;

ALTER INDEX alerts_pkey RENAME TO insights_pkey;
ALTER INDEX idx_alerts_user_status RENAME TO idx_insights_user_status;
ALTER INDEX idx_alerts_unread_dedupe RENAME TO idx_insights_unread_dedupe;

ALTER TABLE insights RENAME CONSTRAINT alerts_user_id_fkey TO insights_user_id_fkey;
ALTER TABLE insights RENAME CONSTRAINT alerts_subscription_id_fkey TO insights_subscription_id_fkey;
ALTER TABLE insights RENAME CONSTRAINT alerts_transaction_id_fkey TO insights_transaction_id_fkey;
