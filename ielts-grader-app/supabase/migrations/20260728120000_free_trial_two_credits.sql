-- Free trial: 2 credits for new users only.
-- Existing profile balances/allowances are left unchanged.

ALTER TABLE public.profiles
  ALTER COLUMN credits_remaining SET DEFAULT 2;

ALTER TABLE public.profiles
  ALTER COLUMN credits_allowance SET DEFAULT 2;
