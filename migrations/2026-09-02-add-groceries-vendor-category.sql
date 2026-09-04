-- Purpose: add GROCERIES to vendor_category so supermarkets and grocery stores (e.g. Carrefour,
--          Super Ariel) get a real category instead of always falling back to OTHER, which had no
--          category that fit a one-off grocery purchase.
-- Date: 2026-09-02

ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'GROCERIES';
