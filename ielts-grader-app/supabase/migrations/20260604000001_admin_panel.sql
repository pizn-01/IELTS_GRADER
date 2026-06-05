-- ============================================================
-- Admin Panel — support messages, discount codes, is_admin flag
-- Rollback:
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;
--   DROP TABLE IF EXISTS public.discount_codes;
--   DROP TABLE IF EXISTS public.support_messages;
-- ============================================================

-- 1. Add is_admin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Support messages (submitted via Settings > Support)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email       text        NOT NULL,
  topic       text        NOT NULL DEFAULT 'Other',
  message     text        NOT NULL,
  status      text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_notes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user_id   ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_status    ON public.support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_created   ON public.support_messages(created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can submit messages
CREATE POLICY "support_messages_insert_own"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own messages
CREATE POLICY "support_messages_select_own"
  ON public.support_messages FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Discount codes (admin-created, applied at checkout)
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text        UNIQUE NOT NULL,
  description    text,
  discount_type  text        NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses       int,                     -- null = unlimited
  uses_count     int         NOT NULL DEFAULT 0,
  expires_at     timestamptz,             -- null = no expiry
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code      ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON public.discount_codes(is_active);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — only service role (admin API) can access discount_codes
