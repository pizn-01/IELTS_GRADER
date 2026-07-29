-- Persist uploaded prompts for Grade My Essay (no exam_task_id).
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS question_text text;
