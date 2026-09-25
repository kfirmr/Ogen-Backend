-- Purpose: let the import's batched vendor and history queries use indexes instead of scanning.
--          Exact vendor matching compares lower(name), which the plain unique index on name cannot
--          serve; fuzzy matching now uses the % operator, which needs the trigram index on
--          lower(name) rather than on name; and charge-history reads filter by user and vendor.
-- Date: 2026-09-24

BEGIN;

CREATE INDEX IF NOT EXISTS idx_vendors_name_lower ON vendors (lower(name));

DROP INDEX IF EXISTS idx_vendors_name_trgm;
CREATE INDEX IF NOT EXISTS idx_vendors_name_lower_trgm ON vendors USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_transactions_user_vendor
  ON transactions (user_id, vendor_id)
  WHERE deleted_at IS NULL;

COMMIT;
