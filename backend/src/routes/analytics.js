const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/analytics/dashboard ────────────────────────────────────────────
router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. All graded submissions for this user (chronological)
    let subQuery = supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'graded')
      .order('created_at', { ascending: true });

    if (req.query.task) {
      const [examType, taskNum] = req.query.task.split(' Task ');
      if (examType && taskNum) {
        subQuery = subQuery.eq('exam_type', examType).eq('task_type', `Task ${taskNum}`);
      }
    }

    const { data: submissions, error: subError } = await subQuery;

    if (subError) throw subError;

    if (!submissions || submissions.length === 0) {
      return res.json({ chartData: [], frequentErrors: [] });
    }

    const submissionIds = submissions.map(s => s.id);

    // 2. Band scores for those submissions
    const { data: reports, error: repError } = await supabaseAdmin
      .from('reports')
      .select('id, submission_id, overall_band, response_band, coherence_band, vocabulary_band, grammar_band')
      .in('submission_id', submissionIds);

    if (repError) throw repError;

    // Sort reports in the same order as submissions (chronological)
    const submissionOrder = Object.fromEntries(submissionIds.map((id, idx) => [id, idx]));
    const sortedReports = (reports || []).sort(
      (a, b) => (submissionOrder[a.submission_id] ?? 0) - (submissionOrder[b.submission_id] ?? 0)
    );

    const chartData = sortedReports.map((row, idx) => ({
      name: `W${idx + 1}`,
      overall: parseFloat(row.overall_band),
      response: parseFloat(row.response_band),
      coherence: parseFloat(row.coherence_band),
      vocabulary: parseFloat(row.vocabulary_band),
      grammar: parseFloat(row.grammar_band),
    }));

    // 3. Frequent errors across all reports
    let frequentErrors = [];
    const reportIds = sortedReports.map(r => r.id);

    if (reportIds.length > 0) {
      const { data: errors } = await supabaseAdmin
        .from('report_errors')
        .select('title, severity')
        .in('report_id', reportIds);

      // Aggregate by title
      const errorMap = {};
      (errors || []).forEach(({ title, severity }) => {
        if (!errorMap[title]) {
          errorMap[title] = { label: title, count: 0, severity };
        }
        errorMap[title].count++;
      });

      frequentErrors = Object.values(errorMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(e => ({
          label: e.label,
          count: e.count,
          impact: ['Major', 'High'].includes(e.severity) ? 'High Impact' : 'Medium Impact',
          type: ['Major', 'High'].includes(e.severity) ? 'red' : 'yellow',
        }));
    }

    return res.json({ chartData, frequentErrors });
  } catch (err) {
    console.error('[analytics/dashboard]', err.message);
    return res.status(500).json({ error: 'Failed to fetch analytics data.' });
  }
});

module.exports = router;
