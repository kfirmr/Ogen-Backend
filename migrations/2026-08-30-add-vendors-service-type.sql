-- Purpose: add vendors.service_type so redundancy alerts can tell that two different vendors sell the
--          same interchangeable service (Netflix vs Disney+, Gold's Gym vs Icon Fitness), which the
--          coarse vendor_category could not express.
-- Date: 2026-08-30

CREATE TYPE service_type AS ENUM (
  'VIDEO_STREAMING',
  'MUSIC_STREAMING',
  'GAMING_SUBSCRIPTION',
  'GYM_MEMBERSHIP',
  'FITNESS_APP',
  'CLOUD_STORAGE',
  'PASSWORD_MANAGER',
  'VPN',
  'PRODUCTIVITY_SUITE',
  'AI_ASSISTANT',
  'DESIGN_TOOL',
  'NONE'
);

ALTER TABLE vendors ADD COLUMN service_type SERVICE_TYPE;

CREATE INDEX idx_vendors_service_type ON vendors (service_type);
