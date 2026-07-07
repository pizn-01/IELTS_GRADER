-- Track scheduled cancellation from Stripe (cancel_at_period_end)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false;
