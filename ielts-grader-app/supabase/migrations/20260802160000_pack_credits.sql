-- One-time credit packs: durable wallet that survives subscription renew/expire.
-- credits_remaining = period credits + pack_credits (total spendable).
-- pack_credits = never-expiring portion from one-time purchases.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pack_credits int NOT NULL DEFAULT 0
  CHECK (pack_credits >= 0);

COMMENT ON COLUMN public.profiles.pack_credits IS
  'Never-expiring credits from one-time packs. Preserved across subscription renew and expire.';
