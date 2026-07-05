-- Store chart images for Academic Task 1 report questions (data URL base64).
-- Rollback: ALTER TABLE public.exam_tasks DROP COLUMN IF EXISTS chart_image;

ALTER TABLE public.exam_tasks ADD COLUMN IF NOT EXISTS chart_image text;
