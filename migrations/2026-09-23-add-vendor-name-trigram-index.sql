-- Purpose: enable fuzzy vendor-name matching so slightly different AI-extracted names for the
-- same merchant (e.g. "Gym City" vs "GymCity Ltd") resolve to one vendor instead of splitting
-- into duplicate vendors and duplicate subscriptions.
-- Date: 2026-09-23

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_vendors_name_trgm ON vendors USING gin (name gin_trgm_ops);
