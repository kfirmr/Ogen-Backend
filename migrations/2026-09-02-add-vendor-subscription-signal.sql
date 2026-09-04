-- Purpose: persist the AI vendor classifier's subscription judgement on the vendor itself
--          (is_likely_subscription, billing_cycle) so a subscription is only created once a
--          second real charge from that vendor confirms the recurrence, instead of trusting a
--          single transaction's AI guess.
-- Date: 2026-09-02

ALTER TABLE vendors ADD COLUMN is_likely_subscription BOOLEAN NULL;
ALTER TABLE vendors ADD COLUMN billing_cycle billing_cycle NULL;
