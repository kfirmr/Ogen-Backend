-- Purpose: add the gamification XP/level schema (levels catalog, xp_actions catalog,
--          xp_events log, and cached xp/level columns on users).
-- Date: 2026-08-26

CREATE TABLE levels (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER      NOT NULL,
  xp_required  INTEGER      NOT NULL,
  title        VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- level_number is the natural key; users.current_level references it directly.
CREATE UNIQUE INDEX idx_levels_level_number ON levels (level_number);
-- Supports "highest level whose threshold the user's total_xp has crossed" lookups.
CREATE INDEX idx_levels_xp_required ON levels (xp_required);

-- Starter ladder; xp_required is the cumulative total_xp needed to reach the level.
-- Placeholder values, editable with no deploy.
INSERT INTO levels (level_number, xp_required, title) VALUES
  (1, 0,    'Getting Started'),
  (2, 100,  'On Track'),
  (3, 300,  'Budget Builder'),
  (4, 700,  'Money Minder'),
  (5, 1500, 'Ogen Pro');

CREATE TABLE xp_actions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(255) NOT NULL,
  xp_value    INTEGER      NOT NULL,
  description TEXT         NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_xp_actions_key ON xp_actions (key);

-- Starter catalog, matching the one hook point wired in this pass. Placeholder value,
-- editable with no deploy. More actions get inserted as more hook points are wired.
INSERT INTO xp_actions (key, xp_value, description) VALUES
  ('SUBSCRIPTION_ADDED', 10, 'User added a subscription to track');

CREATE TABLE xp_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users (id),
  xp_action_id UUID        NOT NULL REFERENCES xp_actions (id),
  xp_awarded   INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user_created ON xp_events (user_id, created_at);
-- Supports undoing a whole import's worth of XP or reporting XP by action.
CREATE INDEX idx_xp_events_action ON xp_events (xp_action_id);

-- Cached, fast-read xp/level snapshot on the user row. current_level FKs to
-- levels.level_number (a unique column), so it can only ever hold a real level.
ALTER TABLE users
  ADD COLUMN total_xp      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN current_level INTEGER NOT NULL DEFAULT 1 REFERENCES levels (level_number);

CREATE INDEX idx_users_current_level ON users (current_level);
