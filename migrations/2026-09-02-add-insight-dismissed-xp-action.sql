-- Purpose: add the INSIGHT_DISMISSED xp_actions entry so acknowledging an insight in the client
--          (the "הבנתי" button) awards XP, matching the +15 XP badge shown on each insight card.
-- Date: 2026-09-02

INSERT INTO xp_actions (key, xp_value, description) VALUES
  ('INSIGHT_DISMISSED', 15, 'User acknowledged (dismissed) an insight');
