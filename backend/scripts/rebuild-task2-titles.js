#!/usr/bin/env node
/**
 * Rebuild Task 2 exam_tasks titles to include a question snippet.
 * Fixes legacy titles like "Education — Opinion (2)" from batch dedupe.
 *
 * Usage: node backend/scripts/rebuild-task2-titles.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { rebuildTask2Title, dedupeTitle } = require('../src/utils/taskBankFormat');

async function fetchAllTask2(supabase) {
  const rows = [];
  const pageSize = 500;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('exam_tasks')
      .select('id, exam_type, task_type, title, question_text')
      .eq('task_type', 'Task 2')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const rows = await fetchAllTask2(supabase);
  console.log(`Found ${rows.length} Task 2 rows.`);

  const seenByCombo = {};
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const comboKey = `${row.exam_type}|${row.task_type}`;
    if (!seenByCombo[comboKey]) seenByCombo[comboKey] = new Set();

    let newTitle = rebuildTask2Title(row.title, row.question_text);
    newTitle = dedupeTitle(newTitle, seenByCombo[comboKey]);

    if (newTitle === row.title) {
      unchanged += 1;
      continue;
    }

    const { error } = await supabase
      .from('exam_tasks')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      console.error(`Failed to update ${row.id}:`, error.message);
      continue;
    }
    updated += 1;
  }

  console.log(`Done. Updated ${updated}, unchanged ${unchanged}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
