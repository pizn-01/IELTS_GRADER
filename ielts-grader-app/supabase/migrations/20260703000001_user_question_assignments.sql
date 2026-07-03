-- Tracks which exam_tasks have been shown to each user (mock / practice).
-- Required for /api/tasks/next unique-question selection.
-- Rollback: DROP TABLE IF EXISTS public.user_question_assignments;

CREATE TABLE IF NOT EXISTS public.user_question_assignments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id      UUID REFERENCES public.exam_tasks(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'mock',
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uqa_user_id   ON public.user_question_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_uqa_task_id   ON public.user_question_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_uqa_user_task ON public.user_question_assignments(user_id, task_id);
