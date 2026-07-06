-- Track whether the user has chosen (or dismissed) their target band prompt.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_band_confirmed boolean NOT NULL DEFAULT false;

-- Existing users keep their current target; don't retro-prompt everyone.
UPDATE public.profiles
SET target_band_confirmed = true
WHERE target_band_confirmed = false;
