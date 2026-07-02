const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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

// Task 1 (General) = letter, Task 1 (Academic) = report, Task 2 = essay
// (Task 2 has no Academic/General distinction in IELTS grading criteria).
function resolveTaskVariant(exam_type, task_type) {
  if (task_type === 'Task 1') {
    return exam_type === 'General' ? 'task1-letter' : 'task1-report';
  }
  return 'task2';
}

async function getTaskRow(exam_task_id) {
  if (!exam_task_id) return null;
  const { data } = await supabaseAdmin
    .from('exam_tasks')
    .select('question_text, title')
    .eq('id', exam_task_id)
    .single();
  return data || null;
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

// ─── Main grading orchestrator (called async after submission is saved) ───
// Same call signature as grader.js's gradeEssayAsync so submissions.js can
// call either engine interchangeably via graderEngine.js.
async function gradeEssayAsync(submissionId, submissionData) {
  const { exam_type, task_type, essay_content, exam_task_id, userId, original_credits } = submissionData;

  console.log(`[pythonGrader] Starting: submission=${submissionId} task=${exam_type} ${task_type}`);

  try {
    const taskVariant = resolveTaskVariant(exam_type, task_type);
    const taskRow = await getTaskRow(exam_task_id);
    const questionText = taskRow?.question_text || '';
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
    } else {
      scriptName = 'AnswerGrader.py';
      args = [
        '--exam-name', examName,
        '--prompt', questionText,
        '--user-answer', essay_content,
      ];
    }

    const result = await runPythonScript(scriptName, args);

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

module.exports = { gradeEssayAsync };
