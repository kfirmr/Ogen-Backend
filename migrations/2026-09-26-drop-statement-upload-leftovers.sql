-- Purpose: drop what only the removed XLSX upload flow used. Imports now come solely from bank
--          syncs, which are created already PROCESSING and never carry a filename.
-- Date: 2026-09-26

ALTER TABLE statement_imports DROP COLUMN filename;

ALTER TABLE statement_imports ALTER COLUMN source DROP DEFAULT;
ALTER TABLE statement_imports ALTER COLUMN status DROP DEFAULT;

ALTER TYPE import_source RENAME TO import_source_old;
CREATE TYPE import_source AS ENUM ('BANK_API');
ALTER TABLE statement_imports
  ALTER COLUMN source TYPE import_source USING source::text::import_source;
DROP TYPE import_source_old;

ALTER TYPE import_status RENAME TO import_status_old;
CREATE TYPE import_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE statement_imports
  ALTER COLUMN status TYPE import_status USING status::text::import_status;
DROP TYPE import_status_old;

ALTER TABLE statement_imports ALTER COLUMN source SET DEFAULT 'BANK_API';
ALTER TABLE statement_imports ALTER COLUMN status SET DEFAULT 'PROCESSING';
