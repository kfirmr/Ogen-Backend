-- Purpose: detach charges that were linked to a subscription only because they came from the same
--          vendor (a drink bought at the gym). A charge now belongs to a subscription only when it
--          is within 15% of the subscription's price, matching RECURRENCE_THRESHOLDS.AMOUNT_TOLERANCE_RATIO.
-- Date: 2026-09-27

UPDATE transactions AS t
SET subscription_id = NULL,
    updated_at = now()
FROM subscriptions AS s
WHERE t.subscription_id = s.id
  AND t.deleted_at IS NULL
  AND abs(t.amount - s.amount) > s.amount * 0.15;
