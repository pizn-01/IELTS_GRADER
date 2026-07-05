-- Task 2 titles were stored as "Topic — Type" only, so imports added "(2)", "(3)" suffixes.
-- Title rebuild is applied via: node backend/scripts/rebuild-task2-titles.js
-- New imports use buildTitle(topic — type, question snippet) in taskBankFormat.js.

-- Optional manual strip of numeric suffixes (script rebuilds full titles):
-- UPDATE public.exam_tasks
-- SET title = regexp_replace(title, '\s\(\d+\)$', '')
-- WHERE task_type = 'Task 2' AND title ~ '\s\(\d+\)$';
