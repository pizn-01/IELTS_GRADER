-- Admin tasks analytics: index + schema columns used by admin API
-- Rollback:
--   DROP INDEX IF EXISTS idx_submissions_exam_task_id;
--   DROP TABLE IF EXISTS public.task_history;
--   ALTER TABLE public.exam_tasks DROP COLUMN IF EXISTS is_active;
--   ALTER TABLE public.exam_tasks DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.exam_tasks
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.exam_tasks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_submissions_exam_task_id
  ON public.submissions(exam_task_id)
  WHERE exam_task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.task_history (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id                 uuid        NOT NULL REFERENCES public.exam_tasks(id) ON DELETE CASCADE,
  changed_by              uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_title          text,
  previous_question_text  text,
  change_note             text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id
  ON public.task_history(task_id, created_at DESC);
