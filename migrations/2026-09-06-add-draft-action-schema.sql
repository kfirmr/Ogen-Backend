-- Purpose: add the draft_actions table backing the agentic "Done For You" execution step —
--          a LangGraph agent drafts an intervention (e.g. a cancellation email) for a detected
--          leak, stored here for the user to review and approve. Nothing is ever sent
--          automatically; EXECUTED is reserved for a future send step.
-- Date: 2026-09-06

CREATE TYPE draft_action_type AS ENUM ('CANCELLATION_EMAIL');
CREATE TYPE draft_action_status AS ENUM ('DRAFTED', 'APPROVED', 'REJECTED', 'EXECUTED');

CREATE TABLE draft_actions (
  id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID                NOT NULL REFERENCES users (id),
  insight_id      UUID                NOT NULL REFERENCES insights (id),
  subscription_id UUID                NULL REFERENCES subscriptions (id),
  vendor_id       UUID                NULL REFERENCES vendors (id),
  action_type     draft_action_type   NOT NULL,
  status          draft_action_status NOT NULL DEFAULT 'DRAFTED',
  target_email    VARCHAR(255)        NULL,
  subject         VARCHAR(255)        NOT NULL,
  body            TEXT                NOT NULL,
  reasoning       TEXT                NULL,
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_actions_user_status ON draft_actions (user_id, status);
-- One draft per detected leak; a rejected draft has no redraft flow yet.
CREATE UNIQUE INDEX idx_draft_actions_insight ON draft_actions (insight_id);
