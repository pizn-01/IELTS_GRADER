-- Acquisition tracking: visitor sessions, page views, profile attribution
-- Rollback:
--   DROP TABLE IF EXISTS public.page_views;
--   DROP TABLE IF EXISTS public.visitor_sessions;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS acquisition_channel;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS landing_path;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS referrer;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS utm_source;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS utm_medium;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS utm_campaign;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS gclid;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS acquisition_country;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS acquisition_city;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS visitor_session_id;

-- ============================================================
-- 1. VISITOR SESSIONS (anonymous + converted)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          text        NOT NULL UNIQUE,
  landing_path        text,
  referrer            text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  utm_term            text,
  gclid               text,
  channel             text        NOT NULL DEFAULT 'direct',
  country             text,
  region              text,
  city                text,
  device_type         text,
  browser             text,
  os                  text,
  page_view_count     int         NOT NULL DEFAULT 1,
  duration_seconds    int         NOT NULL DEFAULT 0,
  is_bounce           boolean     NOT NULL DEFAULT false,
  converted_user_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_first_seen
  ON public.visitor_sessions(first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_channel
  ON public.visitor_sessions(channel);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country
  ON public.visitor_sessions(country);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_converted
  ON public.visitor_sessions(converted_user_id)
  WHERE converted_user_id IS NOT NULL;

-- ============================================================
-- 2. PAGE VIEWS (granular events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.page_views (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text        NOT NULL,
  path        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at
  ON public.page_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_session_id
  ON public.page_views(session_id);

-- ============================================================
-- 3. PROFILE ATTRIBUTION (registered user first-touch)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_channel text,
  ADD COLUMN IF NOT EXISTS landing_path text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS acquisition_country text,
  ADD COLUMN IF NOT EXISTS acquisition_city text,
  ADD COLUMN IF NOT EXISTS visitor_session_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_acquisition_channel
  ON public.profiles(acquisition_channel)
  WHERE acquisition_channel IS NOT NULL;

-- RLS: service role only (backend uses supabaseAdmin)
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
