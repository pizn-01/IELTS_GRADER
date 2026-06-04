const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/reports/:submissionId ──────────────────────────────────────────
router.get('/:submissionId', authenticateToken, async (req, res) => {
  const { submissionId } = req.params;
  const userId = req.user.userId;

  // Verify ownership first
  const { data: submission, error: subError } = await supabaseAdmin
    .from('submissions')
    .select('id, exam_type, task_type, essay_content, word_count, created_at, status')
    .eq('id', submissionId)
    .eq('user_id', userId)
    .single();

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
    model_answer: report.model_answer || null,
    vocabulary_analysis: report.vocabulary_analysis || null,
    grammar_analysis: report.grammar_analysis || null,
    data_structure_analysis: report.data_structure_analysis || null,
    errors: sortedErrors,
    // Submission context
    exam_type: submission.exam_type,
    task_type: submission.task_type,
    essay: submission.essay_content,
    word_count: submission.word_count,
    created_at: submission.created_at,
  });
});

module.exports = router;
