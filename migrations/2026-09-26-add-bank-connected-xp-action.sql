-- Purpose: add the BANK_CONNECTED xp_actions entry so the first successful sync of a bank or card
--          connection awards XP, matching the "+50 XP" shown on the client's connected card.
-- Date: 2026-09-26

INSERT INTO xp_actions (key, xp_value, description) VALUES
  ('BANK_CONNECTED', 50, 'User connected a bank or credit-card account');
