-- Purpose: drop users.current_level. The level is derived from users.total_xp against the
--          levels ladder on every read, so the cached column was redundant and went stale
--          whenever levels.xp_required was retuned.
-- Date: 2026-08-26

-- Drops the FK to levels(level_number) and idx_users_current_level along with the column.
ALTER TABLE users
  DROP COLUMN current_level;
