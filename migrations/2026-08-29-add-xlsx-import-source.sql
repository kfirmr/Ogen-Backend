-- Purpose: add XLSX to import_source so uploaded bank-statement spreadsheets have their own
--          provenance value, distinct from CSV/BANK_API/MANUAL.
-- Date: 2026-08-29

ALTER TYPE import_source ADD VALUE 'XLSX';
