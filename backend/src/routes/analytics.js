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
      name: `${idx + 1}`,
      examLabel: `Exam ${idx + 1}`,
      overall: parseFloat(row.overall_band),
      response: parseFloat(row.response_band),
      coherence: parseFloat(row.coherence_band),
      vocabulary: parseFloat(row.vocabulary_band),
      grammar: parseFloat(row.grammar_band),
    }));

    // 3. Frequent errors across all reports (enriched with rewrite samples)
    let frequentErrors = [];
    const reportIds = sortedReports.map(r => r.id);
    const reportExamIndex = Object.fromEntries(
      sortedReports.map((r, idx) => [r.id, idx + 1])
    );

    const SEVERITY_RANK = { Major: 4, High: 3, Medium: 2, Low: 1 };

    if (reportIds.length > 0) {
      const { data: errors } = await supabaseAdmin
        .from('report_errors')
        .select('title, severity, criteria, sub_category, original_text, correction_text, explanation, report_id, created_at')
        .in('report_id', reportIds)
        .order('created_at', { ascending: true });

      // Aggregate by title; keep worst severity + most recent rewrite sample
      const errorMap = {};
      (errors || []).forEach((err) => {
        const {
          title,
          severity,
          criteria,
          sub_category,
          original_text,
          correction_text,
          explanation,
          report_id,
        } = err;

        if (!errorMap[title]) {
          errorMap[title] = {
            label: title,
            count: 0,
            worstSeverity: severity || 'Medium',
            criteriaCounts: {},
            subCategoryCounts: {},
            sample: null,
            examIndexes: new Set(),
          };
        }

        const entry = errorMap[title];
        entry.count++;

        const rank = SEVERITY_RANK[severity] || 0;
        const worstRank = SEVERITY_RANK[entry.worstSeverity] || 0;
        if (rank > worstRank) entry.worstSeverity = severity;

        if (criteria) {
          entry.criteriaCounts[criteria] = (entry.criteriaCounts[criteria] || 0) + 1;
        }
        if (sub_category) {
          entry.subCategoryCounts[sub_category] = (entry.subCategoryCounts[sub_category] || 0) + 1;
        }

        const examIndex = reportExamIndex[report_id] ?? null;
        if (examIndex != null) entry.examIndexes.add(examIndex);

        // Prefer the most recent exam's rewrite sample
        if (original_text || correction_text || explanation) {
          const prevExam = entry.sample?.examIndex ?? -1;
          if (examIndex == null || examIndex >= prevExam) {
            entry.sample = {
              original_text: original_text || '',
              correction_text: correction_text || '',
              explanation: explanation || '',
              examIndex,
            };
          }
        }
      });

      const modeKey = (counts) => {
        const entries = Object.entries(counts);
        if (entries.length === 0) return null;
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
      };

      frequentErrors = Object.values(errorMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((e) => {
          const isHigh = ['Major', 'High'].includes(e.worstSeverity);
          const isMed = e.worstSeverity === 'Medium';
          return {
            label: e.label,
            count: e.count,
            impact: isHigh ? 'High Impact' : isMed ? 'Medium Impact' : 'Low Impact',
            type: isHigh ? 'red' : isMed ? 'yellow' : 'gray',
            criteria: modeKey(e.criteriaCounts),
            sub_category: modeKey(e.subCategoryCounts),
            examCount: e.examIndexes.size,
            sample: e.sample,
          };
        });
    }

    return res.json({ chartData, frequentErrors });
  } catch (err) {
    console.error('[analytics/dashboard]', err.message);
    return res.status(500).json({ error: 'Failed to fetch analytics data.' });
  }
});

module.exports = router;
