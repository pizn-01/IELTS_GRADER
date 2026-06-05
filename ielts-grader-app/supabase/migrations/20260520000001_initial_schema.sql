-- ============================================================
-- IELTS Grader — Initial Schema
-- Rollback: DROP TABLE report_errors, reports, submissions, exam_tasks, profiles CASCADE;
--           DROP FUNCTION IF EXISTS handle_new_user CASCADE;
--           DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- Extends auth.users with IELTS-specific fields.
-- Created automatically via trigger on user signup.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text        NOT NULL DEFAULT '',
  target_band         numeric(3,1) NOT NULL DEFAULT 7.5
                                  CHECK (target_band >= 1.0 AND target_band <= 9.0),
  credits_remaining   int         NOT NULL DEFAULT 5
                                  CHECK (credits_remaining >= 0),
  profile_image_url   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Trigger: auto-create profile row on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. EXAM TASKS
-- Pre-loaded IELTS question bank. Read-only for regular users.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exam_tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type           text        NOT NULL CHECK (exam_type IN ('Academic', 'General')),
  task_type           text        NOT NULL CHECK (task_type IN ('Task 1', 'Task 2')),
  title               text        NOT NULL,
  question_text       text        NOT NULL,
  time_limit_seconds  int         NOT NULL DEFAULT 2400,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. SUBMISSIONS
-- One row per essay attempt.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_task_id        uuid        REFERENCES public.exam_tasks(id) ON DELETE SET NULL,
  exam_type           text        NOT NULL,
  task_type           text        NOT NULL,
  essay_content       text        NOT NULL,
  word_count          int         NOT NULL DEFAULT 0,
  time_spent_seconds  int         NOT NULL DEFAULT 0,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'grading', 'graded', 'failed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. REPORTS
-- One per submission. Written by the Fly.io grading service.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       uuid        UNIQUE NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  overall_band        numeric(3,1) NOT NULL CHECK (overall_band BETWEEN 1.0 AND 9.0),
  response_band       numeric(3,1) NOT NULL CHECK (response_band BETWEEN 1.0 AND 9.0),
  coherence_band      numeric(3,1) NOT NULL CHECK (coherence_band BETWEEN 1.0 AND 9.0),
  vocabulary_band     numeric(3,1) NOT NULL CHECK (vocabulary_band BETWEEN 1.0 AND 9.0),
  grammar_band        numeric(3,1) NOT NULL CHECK (grammar_band BETWEEN 1.0 AND 9.0),
  strengths           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  weaknesses          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  high_impact_fixes   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  raw_grader_output   jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. REPORT ERRORS
-- Individual error cards within a report.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_errors (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           uuid        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  title               text        NOT NULL,
  severity            text        NOT NULL CHECK (severity IN ('Major', 'High', 'Medium', 'Low')),
  criteria            text        NOT NULL,
  sub_category        text        NOT NULL,
  location_text       text        NOT NULL,
  original_text       text        NOT NULL,
  correction_text     text        NOT NULL,
  explanation         text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_submissions_user_id     ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status      ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at  ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_submission_id   ON public.reports(submission_id);
CREATE INDEX IF NOT EXISTS idx_report_errors_report_id ON public.report_errors(report_id);
CREATE INDEX IF NOT EXISTS idx_report_errors_severity  ON public.report_errors(severity);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles: users can read/update only their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can insert (used by handle_new_user trigger and grading service)
CREATE POLICY "profiles_insert_service"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- exam_tasks: authenticated users can read, no writes from client
ALTER TABLE public.exam_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_tasks_select_authenticated"
  ON public.exam_tasks FOR SELECT
  TO authenticated
  USING (true);

-- submissions: users see only their own
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select_own"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "submissions_insert_own"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update status (grading service)
CREATE POLICY "submissions_update_service"
  ON public.submissions FOR UPDATE
  USING (true);

-- reports: users see only reports linked to their submissions
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
        AND s.user_id = auth.uid()
    )
  );

-- Service role inserts reports (grading service)
CREATE POLICY "reports_insert_service"
  ON public.reports FOR INSERT
  WITH CHECK (true);

-- report_errors: users see only errors linked to their reports
ALTER TABLE public.report_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_errors_select_own"
  ON public.report_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports r
      JOIN public.submissions s ON s.id = r.submission_id
      WHERE r.id = report_id
        AND s.user_id = auth.uid()
    )
  );

-- Service role inserts errors (grading service)
CREATE POLICY "report_errors_insert_service"
  ON public.report_errors FOR INSERT
  WITH CHECK (true);
