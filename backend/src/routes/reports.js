const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');
const { resolveTaskVariant } = require('../utils/taskVariant');
const { elevateModelBand } = require('../utils/modelAnswerBand');

const router = express.Router();

// ─── GET /api/reports/:submissionId ──────────────────────────────────────────
router.get('/:submissionId', authenticateToken, async (req, res) => {
  const { submissionId } = req.params;
  const userId = req.user.userId;

  // Verify ownership first (question_text column may be missing until migration)
  let submission;
  let subError;
  {
    const withQ = await supabaseAdmin
      .from('submissions')
      .select('id, exam_type, task_type, essay_content, word_count, created_at, status, exam_task_id, question_text')
      .eq('id', submissionId)
      .eq('user_id', userId)
      .single();
    if (withQ.error && /question_text/i.test(withQ.error.message || '')) {
      const withoutQ = await supabaseAdmin
        .from('submissions')
        .select('id, exam_type, task_type, essay_content, word_count, created_at, status, exam_task_id')
        .eq('id', submissionId)
        .eq('user_id', userId)
        .single();
      submission = withoutQ.data;
      subError = withoutQ.error;
    } else {
      submission = withQ.data;
      subError = withQ.error;
    }
  }

  if (subError || !submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  if (submission.status === 'grading' || submission.status === 'pending') {
    return res.status(202).json({
      error: 'Report is not ready yet.',
      status: submission.status,
    });
  }

  if (submission.status === 'failed') {
    return res.status(422).json({
      error: 'Grading failed for this submission.',
      status: 'failed',
    });
  }

  // Fetch the report
  const { data: report, error: repError } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('submission_id', submissionId)
    .single();

  if (repError || !report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  // Fetch associated errors ordered by severity impact
  const severityOrder = { Major: 1, High: 2, Medium: 3, Low: 4 };
  const { data: errors } = await supabaseAdmin
    .from('report_errors')
    .select('id, title, severity, criteria, sub_category, location_text, original_text, correction_text, explanation')
    .eq('report_id', report.id);

  const sortedErrors = (errors || []).sort(
    (a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5)
  );

  const rawOutput = report.raw_grader_output || {};
  const deep = rawOutput.deep || {};
  const task_variant =
    rawOutput.task_variant || resolveTaskVariant(submission.exam_type, submission.task_type);

  // Prefer native blocks in deep; fall back to top-level column for older reports
  const data_structure_analysis =
    deep.data_structure_analysis || report.data_structure_analysis || null;
  const argumentation_analysis = deep.argumentation_analysis || null;
  const letter_structure_analysis = deep.letter_structure_analysis || null;
  const flow_logic_analysis = deep.flow_logic_analysis || null;

  const primary = rawOutput.primary || {};
  const subCategoryScores = primary.sub_category_scores || {};

  let taskQuestion = null;
  let questionSource = 'none';
  if (submission.exam_task_id) {
    const { data: taskRow } = await supabaseAdmin
      .from('exam_tasks')
      .select('question_text')
      .eq('id', submission.exam_task_id)
      .maybeSingle();
    taskQuestion = taskRow?.question_text || null;
    if (taskQuestion) questionSource = 'exam_tasks';
  }
  if (!taskQuestion && submission.question_text) {
    taskQuestion = submission.question_text;
    questionSource = 'submission';
  }
  if (!taskQuestion) {
    const rawQuestion =
      report.raw_grader_output?.question_text
      || report.raw_grader_output?.uploaded_question_text
      || null;
    if (rawQuestion) {
      taskQuestion = rawQuestion;
      questionSource = 'raw_grader_output';
    }
  }

  // #region agent log
  try {
    const fs = require('fs');
    fs.appendFileSync('/Users/amir/IELTS_GRADER/.cursor/debug-551c9c.log', JSON.stringify({
      sessionId: '551c9c',
      runId: 'post-fix',
      hypothesisId: 'H1,H3',
      location: 'reports.js:GET',
      message: 'Report question resolution',
      data: {
        submissionId,
        exam_task_id: submission.exam_task_id || null,
        questionSource,
        includesTaskQuestion: Boolean(taskQuestion),
        taskQuestionPreview: String(taskQuestion || '').slice(0, 80),
        hasSubmissionQuestion: Boolean(submission.question_text),
        submissionQuestionPreview: String(submission.question_text || '').slice(0, 80),
      },
      timestamp: Date.now(),
    }) + '\n');
  } catch (_) {}
  // #endregion

  let modelAnswer = report.model_answer || null;
  if (modelAnswer && typeof modelAnswer === 'object') {
    const elevated = elevateModelBand(modelAnswer.estimated_band, report.overall_band);
    modelAnswer = { ...modelAnswer, estimated_band: elevated };
  }

  // #region agent log
  try {
    const fs = require('fs');
    fs.appendFileSync('/Users/amir/IELTS_GRADER/.cursor/debug-247e96.log', JSON.stringify({
      sessionId: '247e96',
      runId: 'post-fix',
      hypothesisId: 'MA1',
      location: 'reports.js:model-band-elevate',
      message: 'Elevated model_answer band on read',
      data: {
        submissionId,
        overall_band: report.overall_band,
        raw_model_band: report.model_answer?.estimated_band ?? null,
        elevated_model_band: modelAnswer?.estimated_band ?? null,
        beats_candidate: modelAnswer?.estimated_band != null
          && Number(modelAnswer.estimated_band) > Number(report.overall_band),
      },
      timestamp: Date.now(),
    }) + '\n');
  } catch (_) {}
  // #endregion

  return res.json({
    id: submissionId,
    overall_band: parseFloat(report.overall_band),
    response_band: parseFloat(report.response_band),
    coherence_band: parseFloat(report.coherence_band),
    vocabulary_band: parseFloat(report.vocabulary_band),
    grammar_band: parseFloat(report.grammar_band),
    strengths: report.strengths || [],
    weaknesses: report.weaknesses || [],
    high_impact_fixes: report.high_impact_fixes || [],
    model_answer: modelAnswer,
    vocabulary_analysis: report.vocabulary_analysis || null,
    grammar_analysis: report.grammar_analysis || null,
    data_structure_analysis,
    argumentation_analysis,
    letter_structure_analysis,
    flow_logic_analysis,
    task_variant,
    sub_category_scores: subCategoryScores,
    raw_grader_output: report.raw_grader_output || null,
    errors: sortedErrors,
    // Submission context
    exam_type: submission.exam_type,
    task_type: submission.task_type,
    exam_task_id: submission.exam_task_id || null,
    taskQuestion,
    question_text: taskQuestion,
    essay: submission.essay_content,
    word_count: submission.word_count,
    created_at: submission.created_at,
  });
});

module.exports = router;
