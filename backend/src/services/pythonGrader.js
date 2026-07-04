const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const sharp = require('sharp');
const { supabaseAdmin } = require('./supabase');

const PYTHON_DIR = path.join(__dirname, '..', '..', 'python');

// Mirrors the executable resolution logic in the client's own server.js —
// prefer a project virtualenv (created at Docker build time in production,
// see backend/Dockerfile) so `openai`/`tiktoken` match
// `pip install -r python/requirements.txt`.
function resolvePythonExecutable() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const posixVenv = path.join(PYTHON_DIR, '.venv', 'bin', 'python3');
  if (fs.existsSync(posixVenv)) return posixVenv;
  const winVenv = path.join(PYTHON_DIR, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(winVenv)) return winVenv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

// Same JSON-extraction approach the client's own server.js used
// (parseJsonFromOutput) — tolerates any stray print()/warning noise a
// script might emit before or after its JSON payload.
function extractJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in script output.');
  }
  return JSON.parse(output.slice(start, end + 1));
}

function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const python = resolvePythonExecutable();
    const child = spawn(python, [path.join(PYTHON_DIR, scriptName), ...args], { cwd: PYTHON_DIR });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      console.error(`[pythonGrader/${scriptName}]`, d.toString());
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start ${scriptName}: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${scriptName} exited with code ${code}: ${stderr.slice(0, 2000)}`));
        return;
      }
      try {
        resolve(extractJson(stdout));
      } catch (err) {
        reject(new Error(`Failed to parse ${scriptName} output: ${err.message}`));
      }
    });
  });
}

const { resolveTaskVariant } = require('../utils/taskVariant');

async function getTaskRow(exam_task_id) {
  if (!exam_task_id) return null;
  const { data } = await supabaseAdmin
    .from('exam_tasks')
    .select('question_text, title, chart_svg')
    .eq('id', exam_task_id)
    .single();
  return data || null;
}

// Task1ReportGrader.py's data-accuracy checking is only as good as the
// reference data it's given. The question bank stores exact chart geometry as
// SVG markup — parse that deterministically (see chart_svg_parser.py) instead
// of rasterizing to PNG and re-reading numbers with a vision model, which
// misreads small axis labels (e.g. "103.2" → "1032") and corrupts the scale.
async function writeChartSvgToTempFile(svg) {
  const filePath = path.join(os.tmpdir(), `chart-${crypto.randomUUID()}.svg`);
  await fs.promises.writeFile(filePath, svg, 'utf8');
  return filePath;
}

// Legacy vision fallback — only used when SVG parsing fails at runtime.
async function renderChartSvgToTempFile(svg) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const filePath = path.join(os.tmpdir(), `chart-${crypto.randomUUID()}.png`);
  await fs.promises.writeFile(filePath, png);
  return filePath;
}

// exam_tasks doesn't store letter_type / bullet_points / chart_type, so we
// auto-detect them from the question text using the client's own
// ImportedQuestionAnalyzer.py (see that file's header comment).
async function detectTask1Metadata(questionText) {
  return runPythonScript('ImportedQuestionAnalyzer.py', ['--question-text', questionText]);
}

const VALID_SEVERITIES = new Set(['Major', 'High', 'Medium', 'Low']);
const VALID_CRITERIA = new Set([
  'Task Response',
  'Coherence & Cohesion',
  'Lexical Resource',
  'Grammatical Range & Accuracy',
]);

function clampBand(raw) {
  const num = parseFloat(raw);
  if (isNaN(num)) return 5.0;
  return Math.round(Math.min(9.0, Math.max(1.0, num)) * 2) / 2;
}

// ─── Schema adapter ──────────────────────────────────────────────────────────
// The client's standalone graders (AnswerGrader.py v7.x, Task1LetterGrader.py,
// Task1ReportGrader.py) return their own rich schema: criteria_scores,
// averaged_scoring, all_errors, revision_data, vocabulary, grammar, etc.
// This maps that schema onto the flat contract the `reports` table and
// ReportView.jsx consume (response_band, strengths, errors, model_answer, ...).

// The letter grader names the first criterion "Task Achievement"; the DB and
// UI use "Task Response" everywhere.
function normalizeCriterion(name) {
  return name === 'Task Achievement' ? 'Task Response' : name;
}

const CRITERIA_ORDER = [
  'Task Response',
  'Coherence & Cohesion',
  'Lexical Resource',
  'Grammatical Range & Accuracy',
];

const SEVERITY_MAP = { major: 'Major', high: 'High', medium: 'Medium', low: 'Low' };

function mapPythonResult(raw) {
  // Already in the flat contract (defensive: allows older/other scripts).
  if (raw.response_band != null) return raw;

  const criteriaScores = {};
  for (const [name, score] of Object.entries(raw.criteria_scores || {})) {
    criteriaScores[normalizeCriterion(name)] = score;
  }

  const averaged = {};
  for (const [name, data] of Object.entries(raw.averaged_scoring || {})) {
    averaged[normalizeCriterion(name)] = data;
  }

  // strengths / weaknesses: pull the per-sub-category observations from the
  // dual-model averaged scoring, in criteria order.
  const strengths = [];
  const weaknesses = [];
  for (const criterion of CRITERIA_ORDER) {
    const subcats = (averaged[criterion] || {}).sub_categories || {};
    for (const sc of Object.values(subcats)) {
      const s = (sc.strengths || '').trim();
      const w = (sc.weaknesses || '').trim();
      if (s && strengths.length < 6 && !strengths.includes(s)) strengths.push(s);
      if (w && weaknesses.length < 6 && !weaknesses.includes(w)) weaknesses.push(w);
    }
  }

  const allErrors = Array.isArray(raw.all_errors) ? raw.all_errors : [];

  const errors = allErrors.map((e) => ({
    title: e.error_label || e.error_id || 'Error',
    severity: SEVERITY_MAP[e.severity] || 'Medium',
    criteria: normalizeCriterion(e.official_criteria || ''),
    sub_category: e.sub_category || 'General',
    location_text: e.location || 'Essay',
    original_text: e.original_text,
    correction_text: e.corrected_text,
    explanation: e.explanation,
  }));

  const high_impact_fixes = allErrors
    .filter((e) => e.severity === 'major' || e.severity === 'high')
    .slice(0, 6)
    .map((e) => ({
      issue: e.error_label || e.sub_category || 'Issue',
      suggestion: e.explanation || e.corrected_text || '',
      impact: e.severity === 'major' ? 'High' : 'Medium',
    }));

  // sub_category_scores for the Dual Assessment tab and the Overview tab's
  // per-criterion breakdown: { criterion: [{ name, band, strength, weakness, evidence }] }
  // `evidence` is the grader's own verbatim (<=20 word) quote from the essay
  // backing that sub-category's assessment — used as the "small example" in the UI.
  const sub_category_scores = {};
  for (const criterion of CRITERIA_ORDER) {
    const subcats = (averaged[criterion] || {}).sub_categories || {};
    const rows = Object.entries(subcats).map(([name, sc]) => ({
      name,
      band: sc.score,
      strength: sc.strengths || '',
      weakness: sc.weaknesses || '',
      evidence: sc.evidence || '',
    }));
    if (rows.length > 0) sub_category_scores[criterion] = rows;
  }

  // model_answer from the revision pass
  const revision = raw.revision_data || {};
  let model_answer = null;
  if (revision.revision) {
    const bandMatch = (revision.revised_score_line || '').match(/(\d+(?:\.\d+)?)/);
    model_answer = {
      text: revision.revision,
      estimated_band: bandMatch ? parseFloat(bandMatch[1]) : null,
      key_changes: Array.isArray(revision.key_improvements) ? revision.key_improvements : [],
    };
  }

  // vocabulary_analysis: group flat vocabulary items by category
  let vocabulary_analysis = null;
  const vocabItems = Array.isArray(raw.vocabulary) ? raw.vocabulary : [];
  if (vocabItems.length > 0) {
    const byCategory = new Map();
    for (const item of vocabItems) {
      const cat = item.category || 'Suggested Vocabulary';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push({
        word: item.word,
        definition: item.definition || '',
        example: item.example || '',
      });
    }
    vocabulary_analysis = {
      categories: [...byCategory.entries()].map(([name, words]) => ({
        name,
        description: `Band 8–9 ${name.toLowerCase()} not yet used in your writing.`,
        words,
      })),
    };
  }

  // grammar_analysis
  const g = (raw.grammar && raw.grammar.grammar_analysis) || raw.grammar || {};
  const graSubcats = (averaged['Grammatical Range & Accuracy'] || {}).sub_categories || {};
  const graWeaknesses = Object.values(graSubcats)
    .map((sc) => (sc.weaknesses || '').trim())
    .filter(Boolean)
    .join(' ');
  let grammar_analysis = null;
  if (g.used_structures || g.suggested_enrichments) {
    grammar_analysis = {
      overview_strengths: g.strengths_weaknesses_summary || '',
      overview_weaknesses: graWeaknesses,
      structures_used: g.used_structures || [],
      // UI shape: { original, improved, explanation }
      enrichment_suggestions: (g.suggested_enrichments || []).map((s) => ({
        original: s.structure || '',
        improved: s.example_context || '',
        explanation: s.benefit || '',
      })),
      expert_tips: g.expert_tips || [],
    };
  }

  // Pass through native per-task analysis blocks from graders unchanged.
  const argumentation_analysis =
    raw.argumentation_analysis && Object.keys(raw.argumentation_analysis).length > 0
      ? raw.argumentation_analysis
      : null;
  const data_structure_analysis =
    raw.data_structure_analysis && Object.keys(raw.data_structure_analysis).length > 0
      ? raw.data_structure_analysis
      : null;
  const letter_structure_analysis =
    raw.letter_structure_analysis && Object.keys(raw.letter_structure_analysis).length > 0
      ? raw.letter_structure_analysis
      : null;
  const flow_logic_analysis =
    raw.flow_logic_analysis && Object.keys(raw.flow_logic_analysis).length > 0
      ? raw.flow_logic_analysis
      : null;

  // secondary_bands from the independent Model B scoring round
  const roundB = raw.scoring_round_b || {};
  const bBands = {};
  for (const criterion of CRITERIA_ORDER) {
    for (const [name, data] of Object.entries(roundB)) {
      if (normalizeCriterion(name) === criterion && data && data.overall_score != null) {
        bBands[criterion] = parseFloat(data.overall_score);
      }
    }
  }
  let secondary_bands = null;
  if (Object.keys(bBands).length === 4) {
    const avgB = Object.values(bBands).reduce((a, b) => a + b, 0) / 4;
    secondary_bands = {
      model: 'model-b',
      overall_band: Math.round(avgB * 2) / 2,
      response_band: bBands['Task Response'],
      coherence_band: bBands['Coherence & Cohesion'],
      vocabulary_band: bBands['Lexical Resource'],
      grammar_band: bBands['Grammatical Range & Accuracy'],
    };
  }

  return {
    overall_band: raw.overall_band,
    response_band: criteriaScores['Task Response'],
    coherence_band: criteriaScores['Coherence & Cohesion'],
    vocabulary_band: criteriaScores['Lexical Resource'],
    grammar_band: criteriaScores['Grammatical Range & Accuracy'],
    strengths,
    weaknesses,
    high_impact_fixes,
    errors,
    sub_category_scores,
    model_answer,
    vocabulary_analysis,
    grammar_analysis,
    data_structure_analysis,
    argumentation_analysis,
    letter_structure_analysis,
    flow_logic_analysis,
    secondary_bands,
  };
}

// ─── Main grading orchestrator (called async after submission is saved) ───
// Same call signature as grader.js's gradeEssayAsync so submissions.js can
// call either engine interchangeably via graderEngine.js.
async function gradeEssayAsync(submissionId, submissionData) {
  const {
    exam_type,
    task_type,
    essay_content,
    exam_task_id,
    question_text: uploadedQuestionText,
    userId,
    original_credits,
  } = submissionData;

  console.log(`[pythonGrader] Starting: submission=${submissionId} task=${exam_type} ${task_type}`);

  try {
    const taskVariant = resolveTaskVariant(exam_type, task_type);
    const taskRow = await getTaskRow(exam_task_id);
    // Prefer bank task prompt; fall back to uploaded prompt (practice upload flow).
    const questionText = taskRow?.question_text || uploadedQuestionText || '';
    const examName = taskRow?.title || `${exam_type} ${task_type}`;

    let bulletPoints = [];
    let letterType = 'formal';
    let chartType = 'Chart';

    if (taskVariant !== 'task2' && questionText) {
      try {
        const meta = await detectTask1Metadata(questionText);
        if (taskVariant === 'task1-letter') {
          bulletPoints = Array.isArray(meta.bulletPoints) ? meta.bulletPoints : [];
          letterType = meta.letterType || 'formal';
        } else {
          chartType = meta.chartType || 'Chart';
        }
      } catch (err) {
        console.warn('[pythonGrader] Task 1 metadata detection failed, using defaults:', err.message);
      }
    }

    let scriptName;
    let args;
    let chartSvgPath = null;
    let chartImagePath = null;
    if (taskVariant === 'task1-letter') {
      scriptName = 'Task1LetterGrader.py';
      args = [
        '--exam-name', examName,
        '--prompt', questionText,
        '--bullet-points', JSON.stringify(bulletPoints),
        '--letter-type', letterType,
        '--opening-line', '',
        '--user-answer', essay_content,
      ];
    } else if (taskVariant === 'task1-report') {
      scriptName = 'Task1ReportGrader.py';
      args = [
        '--exam-name', examName,
        '--prompt', questionText,
        '--chart-type', chartType,
        '--user-answer', essay_content,
      ];
      if (taskRow?.chart_svg) {
        try {
          chartSvgPath = await writeChartSvgToTempFile(taskRow.chart_svg);
          args.push('--chart-svg-file', chartSvgPath);
        } catch (err) {
          console.warn('[pythonGrader] Failed to write chart SVG temp file:', err.message);
        }
        // Vision PNG only as fallback when SVG parsing fails inside the grader
        try {
          chartImagePath = await renderChartSvgToTempFile(taskRow.chart_svg);
          args.push('--chart-image-file', chartImagePath);
        } catch (err) {
          console.warn('[pythonGrader] Chart SVG rasterization failed (vision fallback unavailable):', err.message);
        }
      }
    } else {
      scriptName = 'AnswerGrader.py';
      args = [
        '--exam-name', examName,
        '--prompt', questionText,
        '--user-answer', essay_content,
      ];
    }

    let result;
    try {
      result = mapPythonResult(await runPythonScript(scriptName, args));
    } finally {
      if (chartSvgPath) {
        fs.promises.unlink(chartSvgPath).catch(() => {});
      }
      if (chartImagePath) {
        fs.promises.unlink(chartImagePath).catch(() => {});
      }
    }

    // ── Validate and sanitize all band scores (safety net — same
    //    validation grader.js applies before insert) ──────────────────────
    const overall_band = clampBand(result.overall_band);
    const response_band = clampBand(result.response_band);
    const coherence_band = clampBand(result.coherence_band);
    const vocabulary_band = clampBand(result.vocabulary_band);
    const grammar_band = clampBand(result.grammar_band);
    const strengths = Array.isArray(result.strengths) ? result.strengths : [];
    const weaknesses = Array.isArray(result.weaknesses) ? result.weaknesses : [];
    const high_impact_fixes = Array.isArray(result.high_impact_fixes) ? result.high_impact_fixes : [];
    const errors = Array.isArray(result.errors) ? result.errors : [];

    // ── Insert report ────────────────────────────────────────────────────
    const { data: report, error: repError } = await supabaseAdmin
      .from('reports')
      .insert({
        submission_id: submissionId,
        overall_band,
        response_band,
        coherence_band,
        vocabulary_band,
        grammar_band,
        strengths,
        weaknesses,
        high_impact_fixes,
        model_answer: result.model_answer || null,
        vocabulary_analysis: result.vocabulary_analysis || null,
        grammar_analysis: result.grammar_analysis || null,
        data_structure_analysis: result.data_structure_analysis || null,
        // NOTE: nested as { primary, deep, secondary_bands } to match the
        // exact shape grader.js (JS engine) produces — ReportView.jsx's
        // "Dual Assessment" tab reads raw_grader_output.primary.sub_category_scores
        // and raw_grader_output.secondary_bands directly.
        raw_grader_output: {
          task_variant: taskVariant,
          primary: {
            overall_band,
            response_band,
            coherence_band,
            vocabulary_band,
            grammar_band,
            strengths,
            weaknesses,
            high_impact_fixes,
            errors,
            sub_category_scores: result.sub_category_scores || {},
            model: 'gpt-4o-mini',
          },
          deep: {
            model_answer: result.model_answer || null,
            vocabulary_analysis: result.vocabulary_analysis || null,
            grammar_analysis: result.grammar_analysis || null,
            data_structure_analysis: result.data_structure_analysis || null,
            argumentation_analysis: result.argumentation_analysis || null,
            letter_structure_analysis: result.letter_structure_analysis || null,
            flow_logic_analysis: result.flow_logic_analysis || null,
          },
          secondary_bands: result.secondary_bands || null,
        },
      })
      .select('id')
      .single();

    if (repError) {
      throw new Error(`Report insert failed: ${repError.message}`);
    }

    // ── Insert error cards ───────────────────────────────────────────────
    if (errors.length > 0) {
      const errorRows = errors
        .filter((e) => e.original_text && e.correction_text && e.explanation)
        .map((e) => ({
          report_id: report.id,
          title: (e.title || 'Error').substring(0, 255),
          severity: VALID_SEVERITIES.has(e.severity) ? e.severity : 'Medium',
          criteria: VALID_CRITERIA.has(e.criteria) ? e.criteria : 'Grammatical Range & Accuracy',
          sub_category: (e.sub_category || 'General').substring(0, 255),
          location_text: (e.location_text || 'Essay').substring(0, 255),
          original_text: e.original_text,
          correction_text: e.correction_text,
          explanation: e.explanation,
        }));

      if (errorRows.length > 0) {
        const { error: errInsertError } = await supabaseAdmin.from('report_errors').insert(errorRows);
        if (errInsertError) {
          console.error('[pythonGrader] Error cards insert failed:', errInsertError.message);
        }
      }
    }

    // ── Mark submission as graded ────────────────────────────────────────
    await supabaseAdmin.from('submissions').update({ status: 'graded' }).eq('id', submissionId);

    console.log(`[pythonGrader] Done: submission=${submissionId} band=${overall_band}`);
  } catch (err) {
    console.error(`[pythonGrader] Failed: submission=${submissionId}`, err.message);

    // Mark as failed and refund the credit
    await supabaseAdmin.from('submissions').update({ status: 'failed' }).eq('id', submissionId);

    if (userId && typeof original_credits === 'number') {
      await supabaseAdmin
        .from('profiles')
        .update({ credits_remaining: original_credits })
        .eq('id', userId);
      console.log(`[pythonGrader] Credit refunded for user=${userId}`);
    }
  }
}

module.exports = { gradeEssayAsync, resolveTaskVariant };
