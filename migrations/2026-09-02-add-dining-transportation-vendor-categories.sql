-- Purpose: add DINING and TRANSPORTATION to vendor_category so restaurants/takeout and
--          transportation vendors (taxis, public transit, fuel) get their own category instead of
--          falling back to OTHER — matching icons already bundled in the client but unused.
-- Date: 2026-09-02

ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'DINING';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'TRANSPORTATION';
