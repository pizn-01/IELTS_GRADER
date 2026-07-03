// One-off import/backfill for Academic Task 1 report questions:
//   1. Backfills chart_svg (real SVG from ielts_task1_report.json) onto every
//      existing active report row whose scenario matches a JSON entry.
//   2. Inserts any unique JSON scenarios not yet represented in the DB.
// Requires the chart_svg column to already exist (see migration
// 20260703160000_add_chart_svg_column.sql — run manually in Supabase SQL
// editor first, since this project has no direct Postgres/DDL access).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SVG_RE = /<svg[\s\S]*?<\/svg>/i;
const INSTRUCTION =
  'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.';

function norm(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function scenarioOnly(questionText) {
  return norm(questionText.replace(/\[Chart image provided\]/gi, '').split(/Summarise the information/i)[0]);
}

function splitPrompt(prompt) {
  const svgMatch = prompt.match(SVG_RE);
  const svg = svgMatch ? svgMatch[0] : null;
  const scenario = prompt.replace(SVG_RE, '').trim();
  return { scenario, svg };
}

async function run() {
  const jsonPath = path.join(__dirname, '..', '..', 'ielts_task1_report.json');
  const reportJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${reportJson.length} report entries from JSON.`);

  // Dedupe by normalized scenario text, keep first occurrence.
  const uniqueByScenario = new Map();
  for (const entry of reportJson) {
    const { scenario, svg } = splitPrompt(entry.prompt);
    const key = norm(scenario);
    if (!uniqueByScenario.has(key)) {
      uniqueByScenario.set(key, { scenario, svg, chartType: entry['chart-type'] });
    }
  }
  console.log(`Unique scenarios: ${uniqueByScenario.size}`);

  const { data: existingRows, error: fetchErr } = await sb
    .from('exam_tasks')
    .select('id, question_text, chart_svg')
    .eq('exam_type', 'Academic')
    .eq('task_type', 'Task 1')
    .eq('is_active', true);

  if (fetchErr) {
    console.error('Fetch failed:', fetchErr.message);
    process.exit(1);
  }
  console.log(`Existing active rows: ${existingRows.length}`);

  // ── 1. Backfill chart_svg on matching existing rows ──────────────────────
  let backfilled = 0;
  let alreadySet = 0;
  let noMatch = 0;
  const matchedScenarioKeys = new Set();

  for (const row of existingRows) {
    const rowScenarioKey = scenarioOnly(row.question_text);
    const jsonEntry = uniqueByScenario.get(rowScenarioKey);
    if (!jsonEntry) {
      noMatch++;
      continue;
    }
    matchedScenarioKeys.add(rowScenarioKey);
    if (row.chart_svg) {
      alreadySet++;
      continue;
    }
    const { error: upErr } = await sb
      .from('exam_tasks')
      .update({ chart_svg: jsonEntry.svg })
      .eq('id', row.id);
    if (upErr) {
      console.error(`  backfill failed for ${row.id}:`, upErr.message);
    } else {
      backfilled++;
    }
  }
  console.log(`Backfilled chart_svg: ${backfilled}, already set: ${alreadySet}, no JSON match: ${noMatch}`);

  // ── 2. Insert unique JSON scenarios not yet in DB ─────────────────────────
  // Title is UNIQUE per (exam_type, task_type). Many scenarios share the same
  // opening sentence template (only the country/measure differs later in the
  // text), so the 60-char title snippet can collide — disambiguate with a
  // " (2)", " (3)"... suffix, checked against ALL rows (active + inactive).
  const { data: allTitleRows } = await sb
    .from('exam_tasks')
    .select('title')
    .eq('exam_type', 'Academic')
    .eq('task_type', 'Task 1');
  const usedTitles = new Set((allTitleRows || []).map((r) => r.title));

  const toInsert = [];
  for (const [key, entry] of uniqueByScenario) {
    if (matchedScenarioKeys.has(key)) continue;
    let title = `${entry.chartType} — ${entry.scenario.slice(0, 60)}...`;
    if (usedTitles.has(title)) {
      let n = 2;
      while (usedTitles.has(`${title} (${n})`)) n++;
      title = `${title} (${n})`;
    }
    usedTitles.add(title);

    const question_text = `${entry.scenario} ${INSTRUCTION}\n\nWrite at least 150 words.`;
    toInsert.push({
      exam_type: 'Academic',
      task_type: 'Task 1',
      title,
      question_text,
      chart_svg: entry.svg,
      time_limit_seconds: 1200,
      is_active: true,
    });
  }
  console.log(`New scenarios to insert: ${toInsert.length}`);

  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50);
    const { error: insErr } = await sb.from('exam_tasks').insert(batch);
    if (insErr) {
      console.error(`  insert batch ${i}-${i + batch.length} failed:`, insErr.message);
    } else {
      console.log(`  inserted rows ${i + 1}-${i + batch.length}`);
    }
  }

  const { count } = await sb
    .from('exam_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('exam_type', 'Academic')
    .eq('task_type', 'Task 1')
    .eq('is_active', true);
  const { count: svgCount } = await sb
    .from('exam_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('exam_type', 'Academic')
    .eq('task_type', 'Task 1')
    .eq('is_active', true)
    .not('chart_svg', 'is', null);
  console.log(`\nFinal active Academic Task 1 rows: ${count}, with chart_svg: ${svgCount}`);
}

run().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
