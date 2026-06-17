-- ─── IELTS Grader — Supabase Migration ───────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).

-- 1. Email verification columns on profiles
--    Existing users default to verified=true; new signups default to false.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE profiles ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- 2. Question assignment tracking
CREATE TABLE IF NOT EXISTS user_question_assignments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id      UUID REFERENCES exam_tasks(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'mock',   -- 'mock' | 'practice'
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uqa_user_id   ON user_question_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_uqa_task_id   ON user_question_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_uqa_user_task ON user_question_assignments(user_id, task_id);
