-- Purpose: add HIGH_SPENDING to insight_type for per-transaction spending-behavior insights
--          (e.g. an unusually high bill for a recurring vendor, or a large one-off purchase),
--          distinct from the subscription-scoped OVERPAYING/DUPLICATE insights.
-- Date: 2026-08-29
-- Note: the type was renamed from alert_type to insight_type by the 2026-08-30 rename migration;
--       this file was never actually applied, so it targets the current insight_type name.

ALTER TYPE insight_type ADD VALUE IF NOT EXISTS 'HIGH_SPENDING';
