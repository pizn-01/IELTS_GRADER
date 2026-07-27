-- Ensure free-trial profiles show a 3-credit allowance denominator.
-- Does not change credits_remaining (no free top-up).

UPDATE public.profiles
SET credits_allowance = GREATEST(credits_allowance, 3)
WHERE (subscription_plan IS NULL OR subscription_status IS NULL
       OR subscription_status NOT IN ('active', 'trialing'))
  AND credits_allowance < 3;
