-- ============================================================
-- Free Trial: reduce default credits from 5 → 1
-- New signups get 1 free evaluation credit instead of 5.
-- Rollback: ALTER TABLE public.profiles ALTER COLUMN credits_remaining SET DEFAULT 5;
-- ============================================================

ALTER TABLE public.profiles ALTER COLUMN credits_remaining SET DEFAULT 1;
