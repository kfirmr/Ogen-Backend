-- Purpose: replace the vendors.is_likely_subscription boolean with a three-way charge_kind so an
--          essential household bill (electricity, water, municipal tax, insurance, phone lines) is
--          no longer conflated with a cancellable subscription, then remove the subscriptions the
--          old boolean wrongly created for such bills.
-- Date: 2026-09-24

BEGIN;

CREATE TYPE charge_kind AS ENUM ('ONE_OFF', 'SUBSCRIPTION', 'ESSENTIAL_BILL');

ALTER TABLE vendors ADD COLUMN charge_kind charge_kind NULL;

UPDATE vendors
SET charge_kind = CASE
  WHEN category IN ('UTILITIES', 'INSURANCE', 'GOVERNMENT', 'COMMUNICATION') THEN 'ESSENTIAL_BILL'::charge_kind
  WHEN is_likely_subscription THEN 'SUBSCRIPTION'::charge_kind
  WHEN NOT is_likely_subscription THEN 'ONE_OFF'::charge_kind
END;

ALTER TABLE vendors DROP COLUMN is_likely_subscription;

CREATE TEMP TABLE essential_bill_subscriptions ON COMMIT DROP AS
SELECT s.id
FROM subscriptions s
JOIN vendors v ON v.id = s.vendor_id
WHERE v.charge_kind = 'ESSENTIAL_BILL';

UPDATE transactions
SET subscription_id = NULL
WHERE subscription_id IN (SELECT id FROM essential_bill_subscriptions);

DELETE FROM draft_actions WHERE subscription_id IN (SELECT id FROM essential_bill_subscriptions);
DELETE FROM insights WHERE subscription_id IN (SELECT id FROM essential_bill_subscriptions);
DELETE FROM subscriptions WHERE id IN (SELECT id FROM essential_bill_subscriptions);

COMMIT;
