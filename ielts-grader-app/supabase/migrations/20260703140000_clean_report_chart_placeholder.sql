-- Remove the literal "[Chart image provided]" placeholder text left over from
-- question-bank import. It served no purpose (no chart image is attached) and
-- cluttered the Academic Task 1 report prompt shown to candidates.
-- Rollback: re-seed from 20260520000002_seed_exam_tasks.sql if needed.

UPDATE public.exam_tasks
SET question_text = trim(both E'\n' from regexp_replace(
  regexp_replace(question_text, E'\\s*\\[Chart image provided\\]\\s*', ' ', 'gi'),
  E' +\n', E'\n', 'g'
))
WHERE question_text ~* E'\\[Chart image provided\\]';
