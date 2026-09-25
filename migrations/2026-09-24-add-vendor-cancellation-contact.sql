-- Purpose: store how each vendor is actually cancelled (email, web page, in-app or phone), found by a
--          web lookup with its source page and check date, instead of a single email guessed by the
--          classifier; and record on the subscription the address the user sent their request to.
-- Date: 2026-09-24

BEGIN;

CREATE TYPE cancellation_method AS ENUM ('WEB', 'EMAIL', 'PHONE', 'IN_APP');

ALTER TABLE vendors ADD COLUMN cancellation_method cancellation_method NULL;
ALTER TABLE vendors ADD COLUMN cancellation_url VARCHAR(2048) NULL;
ALTER TABLE vendors ADD COLUMN cancellation_phone VARCHAR(32) NULL;
ALTER TABLE vendors ADD COLUMN cancellation_source_url VARCHAR(2048) NULL;
ALTER TABLE vendors ADD COLUMN cancellation_checked_at TIMESTAMPTZ NULL;

ALTER TABLE subscriptions ADD COLUMN cancellation_email VARCHAR(255) NULL;

COMMIT;
