-- Product funnel events (signup → payment)
-- Rollback:
--   DROP TABLE IF EXISTS public.product_events;

CREATE TABLE IF NOT EXISTS public.product_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  text        NOT NULL,
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id  text,
  properties  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON public.product_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_created_at
  ON public.product_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_user_created
  ON public.product_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- RLS: service role only (backend uses supabaseAdmin)
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
