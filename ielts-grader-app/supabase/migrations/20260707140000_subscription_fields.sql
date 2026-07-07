-- Subscription billing fields on profiles + invoice idempotency on payments

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_plan text
    CHECK (subscription_plan IS NULL OR subscription_plan IN ('weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS subscription_status text
    CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS credits_allowance int NOT NULL DEFAULT 1
    CHECK (credits_allowance >= 0);

UPDATE public.profiles
SET credits_allowance = 1
WHERE credits_allowance IS NULL OR credits_allowance = 0;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id
  ON public.payments (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
