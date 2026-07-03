-- Remove redundant opening-line and word-count instructions from General Task 1
-- letter prompts. Bullet points (numbered 1. 2. 3.) are kept for grader parsing.
-- Rollback: re-seed from 20260520000002_seed_exam_tasks.sql if needed.

UPDATE public.exam_tasks
SET question_text = trim(both E'\n' from regexp_replace(
  regexp_replace(
    question_text,
    E'\nOpening line:[^\n]*',
    '',
    'g'
  ),
  E'\nWrite at least 150 words\\. You do NOT need to write any addresses\\.?',
  '',
  'g'
))
WHERE exam_type = 'General'
  AND task_type = 'Task 1'
  AND (
    question_text ~ E'Opening line:'
    OR question_text ~ E'You do NOT need to write any addresses'
  );
