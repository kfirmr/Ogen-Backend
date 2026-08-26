-- Purpose: retitle the level ladder with Hebrew, finance-themed saver ranks so the
--          gamification copy matches the product's language and "anchor" branding.
--          Data-only change; the levels table shape is unchanged, so the ERD stays as is.
-- Date: 2026-08-26

UPDATE levels SET title = 'חוסך מתחיל'  WHERE level_number = 1;
UPDATE levels SET title = 'חוסך מתמיד'  WHERE level_number = 2;
UPDATE levels SET title = 'מנהל תקציב'  WHERE level_number = 3;
UPDATE levels SET title = 'אלוף החיסכון' WHERE level_number = 4;
UPDATE levels SET title = 'עוגן פיננסי'  WHERE level_number = 5;
