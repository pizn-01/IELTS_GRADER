// One-off import: fills exam_tasks (Task 2) from the canonical ielts_task2.json
// bank so both Academic and General candidates draw from the full 300-question
// pool (real IELTS Task 2 essay topics are shared across both exam types).
// Safe to re-run: skips any question whose normalized text already exists.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function norm(s) {
  return s.replace(/Write at least 250 words\.?/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function run() {
  const jsonPath = path.join(__dirname, '..', '..', 'ielts_task2.json');
  const task2 = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${task2.length} Task 2 questions from JSON.`);

  for (const examType of ['Academic', 'General']) {
    const { data: existing, error: fetchErr } = await sb
      .from('exam_tasks')
      .select('question_text, title')
      .eq('exam_type', examType)
      .eq('task_type', 'Task 2')
      .eq('is_active', true);

    if (fetchErr) {
      console.error(`[${examType}] fetch failed:`, fetchErr.message);
      continue;
    }

    const existingSet = new Set((existing || []).map((r) => norm(r.question_text)));
    const missing = task2.filter((j) => !existingSet.has(norm(j.question)));

    // Title is UNIQUE per (exam_type, task_type). The single existing row per
    // topic/type combo uses "Topic — Type"; additional variants from the JSON
    // bank get a "(2)", "(3)"... suffix so inserts don't collide.
    const variantCounter = new Map(); // "topic|type" -> next suffix number
    for (const row of existing || []) {
      const key = row.title.replace(/\s*\(\d+\)$/, '');
      const match = row.title.match(/\((\d+)\)$/);
      const num = match ? parseInt(match[1], 10) : 1;
      variantCounter.set(key, Math.max(variantCounter.get(key) || 1, num + 1));
    }

    const rows = missing.map((j) => {
      const baseTitle = `${j.topic} — ${j.type}`;
      const nextNum = variantCounter.get(baseTitle) || 2;
      variantCounter.set(baseTitle, nextNum + 1);
      return {
        exam_type: examType,
        task_type: 'Task 2',
        title: `${baseTitle} (${nextNum})`,
        question_text: `${j.question}\n\nWrite at least 250 words.`,
        time_limit_seconds: 2400,
        is_active: true,
      };
    });

    console.log(`[${examType}] existing=${existingSet.size} missing=${rows.length}`);

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error: insErr } = await sb.from('exam_tasks').insert(batch);
      if (insErr) {
        console.error(`[${examType}] insert batch ${i}-${i + batch.length} failed:`, insErr.message);
      } else {
        console.log(`[${examType}] inserted rows ${i + 1}-${i + batch.length}`);
      }
    }
  }

  const { count: acadCount } = await sb.from('exam_tasks').select('id', { count: 'exact', head: true }).eq('exam_type', 'Academic').eq('task_type', 'Task 2').eq('is_active', true);
  const { count: genCount } = await sb.from('exam_tasks').select('id', { count: 'exact', head: true }).eq('exam_type', 'General').eq('task_type', 'Task 2').eq('is_active', true);
  console.log(`\nFinal active Task 2 counts — Academic: ${acadCount}, General: ${genCount}`);
}

run().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
