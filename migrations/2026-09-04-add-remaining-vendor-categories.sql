-- Purpose: add the remaining vendor_category values so every category icon already bundled in the
--          client has a matching category instead of always falling back to OTHER — pets, cosmetics,
--          government, electronics, home design, books/print, fuel/energy, money transfer, debt
--          repayment, kids/education, leisure/sports, financial fees, shopping/apparel, and
--          travel/vacations.
-- Date: 2026-09-04

ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'PETS';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'COSMETICS';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'GOVERNMENT';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'ELECTRONICS';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'HOME_DESIGN';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'BOOKS_PRINT';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'FUEL_ENERGY';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'MONEY_TRANSFER';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'DEBT_REPAYMENT';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'KIDS_EDUCATION';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'LEISURE_SPORTS';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'FINANCIAL_FEES';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'SHOPPING_APPAREL';
ALTER TYPE vendor_category ADD VALUE IF NOT EXISTS 'TRAVEL_VACATIONS';
