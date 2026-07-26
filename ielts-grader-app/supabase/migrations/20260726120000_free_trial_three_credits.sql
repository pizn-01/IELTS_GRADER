-- Free trial: 3 credits for new users; top up free-trial profiles still on 0–1 remaining.

ALTER TABLE public.profiles
  ALTER COLUMN credits_remaining SET DEFAULT 3;

ALTER TABLE public.profiles
  ALTER COLUMN credits_allowance SET DEFAULT 3;

-- Only raise free-trial users with 0–1 remaining up to 3/3.
-- Do not reduce balances for users who already have more credits (e.g. admin grants).
UPDATE public.profiles
SET credits_remaining = 3,
    credits_allowance = GREATEST(credits_allowance, 3)
WHERE subscription_plan IS NULL
  AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'trialing'))
  AND credits_remaining <= 1;
