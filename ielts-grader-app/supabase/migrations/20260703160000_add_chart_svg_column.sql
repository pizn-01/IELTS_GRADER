-- Store the real chart SVG markup for Academic Task 1 report questions so the
-- UI can render the actual chart from the question bank instead of a
-- synthetic/derived one. NULL for Task 2 and General Task 1 (letter) rows,
-- and for any Task 1 report rows imported before this column existed (until
-- backfilled).
-- Rollback: ALTER TABLE public.exam_tasks DROP COLUMN IF EXISTS chart_svg;

ALTER TABLE public.exam_tasks ADD COLUMN IF NOT EXISTS chart_svg text;
