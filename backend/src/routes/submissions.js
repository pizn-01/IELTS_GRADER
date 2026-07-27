const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');
const { gradeEssayAsync } = require('../services/graderEngine');
const { isPeriodEnded, expireSubscriptionAccess } = require('../services/subscriptionSync');
const { trackProductEvent } = require('../utils/productEvents');
const { FREE_TRIAL_CREDITS } = require('../services/subscriptionPlans');

const router = express.Router();

function isFreeTrialProfile(profile) {
  if (!profile || profile.is_admin) return false;
  if (profile.subscription_status === 'active') return false;
  const allowance = Number(profile.credits_allowance);
  if (Number.isFinite(allowance) && allowance > FREE_TRIAL_CREDITS) return false;
  return true;
}

// ─── POST /api/submissions ────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const {
    exam_type,
    task_type,
    essay_content,
    time_spent_seconds = 0,
    exam_task_id,
    question_text,
    bullet_points,
    letter_type,
    opening_line,
    chart_type,
    chart_image,
  } = req.body;
  const userId = req.user.userId;

  if (!exam_type || !task_type || !essay_content) {
    return res.status(400).json({ error: 'exam_type, task_type, and essay_content are required.' });
  }

  // chart_image can be large (data URL); cap before deducting credits
  let chartImage;
  if (typeof chart_image === 'string' && chart_image.length > 0) {
    if (chart_image.length > 16 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Chart image is too large. Please use a smaller photo (under ~10MB).',
      });
    }
    chartImage = chart_image;
  }

  const word_count = essay_content.trim().split(/\s+/).filter(Boolean).length;

  // Fetch current credit balance and subscription access
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('credits_remaining, credits_allowance, subscription_status, subscription_period_end, is_admin')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }

  if (isPeriodEnded(profile.subscription_period_end)) {
    // Paid period over → zero credits and clear period so free/admin credits can work again.
    if (
      profile.subscription_status === 'active'
      || profile.subscription_status === 'past_due'
      || profile.credits_remaining > 0
    ) {
      await expireSubscriptionAccess(userId);
    }
    return res.status(403).json({
      error: 'Your subscription has ended. Subscribe to continue grading.',
    });
  }

  if (profile.credits_remaining <= 0) {
    return res.status(403).json({
      error: 'Insufficient evaluation credits. Please purchase more to continue.',
    });
  }

  // Deduct 1 credit atomically with optimistic lock — verify a row was actually updated
  const { error: deductError, count: deductCount } = await supabaseAdmin
    .from('profiles')
    .update({ credits_remaining: profile.credits_remaining - 1 })
    .eq('id', userId)
    .eq('credits_remaining', profile.credits_remaining) // Optimistic lock
    .select('*', { count: 'exact' });

  if (deductError) {
    return res.status(500).json({ error: 'Failed to deduct credit. Please try again.' });
  }

  // count === 0 means another request already changed the balance (race condition)
  if (deductCount === 0) {
    return res.status(409).json({ error: 'Credit balance changed concurrently. Please try again.' });
  }

  // Create the submission record
  const { data: submission, error: subError } = await supabaseAdmin
    .from('submissions')
    .insert({
      user_id: userId,
      exam_task_id: exam_task_id || null,
      exam_type,
      task_type,
      essay_content,
      word_count,
      time_spent_seconds,
      status: 'grading',
    })
    .select('id')
    .single();

  if (subError) {
    // Refund the credit on insertion failure
    await supabaseAdmin
      .from('profiles')
      .update({ credits_remaining: profile.credits_remaining })
      .eq('id', userId);
    console.error('[submissions/post] Insert error:', subError.message);
    return res.status(500).json({ error: 'Failed to create submission.' });
  }

  // Respond immediately — grading runs in background
  res.status(202).json({
    submission_id: submission.id,
    message: 'Submission received. AI grading in progress.',
  });

  trackProductEvent({
    eventName: 'test_completed',
    userId,
    properties: {
      submission_id: submission.id,
      exam_type,
      task_type,
    },
  }).catch(() => {});

  // Free-trial engagement: first credit vs all 3 exhausted
  if (isFreeTrialProfile(profile)) {
    const creditsBefore = profile.credits_remaining;
    const creditsAfter = creditsBefore - 1;
    const allowance = Number(profile.credits_allowance);
    const freeAllowance = Number.isFinite(allowance) && allowance > 0
      ? Math.min(allowance, FREE_TRIAL_CREDITS)
      : FREE_TRIAL_CREDITS;
    const engagementProps = {
      submission_id: submission.id,
      exam_type,
      task_type,
      credits_before: creditsBefore,
      credits_after: creditsAfter,
      free_allowance: freeAllowance,
    };

    if (creditsBefore === freeAllowance) {
      trackProductEvent({
        eventName: 'free_credit_1_used',
        userId,
        properties: engagementProps,
      }).catch(() => {});
    }
    if (creditsAfter === 0) {
      trackProductEvent({
        eventName: 'free_credits_all_used',
        userId,
        properties: engagementProps,
      }).catch(() => {});
    }
  }

  // Fire-and-forget grading — transient failures are retried until a report exists
  gradeEssayAsync(submission.id, {
    exam_type,
    task_type,
    essay_content,
    exam_task_id: exam_task_id || null,
    question_text: typeof question_text === 'string' ? question_text.trim() : '',
    bullet_points: Array.isArray(bullet_points) ? bullet_points : undefined,
    letter_type: typeof letter_type === 'string' ? letter_type : undefined,
    opening_line: typeof opening_line === 'string' ? opening_line : undefined,
    chart_type: typeof chart_type === 'string' ? chart_type : undefined,
    chart_image: chartImage,
    userId,
    original_credits: profile.credits_remaining,
  }).catch(err => console.error('[gradeEssayAsync] Uncaught:', err.message));
});

// ─── GET /api/submissions/status/:id ─────────────────────────────────────────
router.get('/status/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const progressMap = { pending: 10, grading: 60, graded: 100, failed: 0 };

  return res.json({
    status: data.status,
    progress_pct: progressMap[data.status] ?? 0,
  });
});

// ─── GET /api/submissions ─────────────────────────────────────────────────────
// Full history list used by ReportsOverview. Uses two explicit queries instead
// of PostgREST embedded resources to avoid FK relationship detection issues.
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { limit = 50, offset = 0, task } = req.query;

  try {
    // List views don't need full essays — keep a short excerpt for search only.
    let query = supabaseAdmin
      .from('submissions')
      .select('id, exam_type, task_type, word_count, time_spent_seconds, status, created_at, essay_content', { count: 'exact' })
      .eq('user_id', userId);

    if (task) {
      const [examType, taskNum] = task.split(' Task ');
      if (examType && taskNum) {
        query = query.eq('exam_type', examType).eq('task_type', `Task ${taskNum}`);
      }
    }

    const { data: submissions, count, error: subError } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (subError) {
      console.error('[submissions/list] submissions query:', subError.message);
      return res.status(500).json({ error: 'Failed to fetch submissions.' });
    }

    if (!submissions || submissions.length === 0) {
      return res.json({ data: [], total: 0 });
    }

    // 2. Fetch band scores for these submission IDs separately
    const submissionIds = submissions.map(s => s.id);
    const { data: reports, error: repError } = await supabaseAdmin
      .from('reports')
      .select('submission_id, overall_band, response_band, coherence_band, vocabulary_band, grammar_band')
      .in('submission_id', submissionIds);

    if (repError) {
      console.error('[submissions/list] reports query:', repError.message);
      // Non-fatal — return submissions without band data rather than failing
    }

    // 3. Build lookup map and merge
    const reportMap = {};
    (reports || []).forEach(r => { reportMap[r.submission_id] = r; });

    const flattened = submissions.map(s => {
      const r = reportMap[s.id];
      const essay = s.essay_content || '';
      return {
        id:                s.id,
        exam_type:         s.exam_type,
        task_type:         s.task_type,
        word_count:        s.word_count,
        time_spent_seconds: s.time_spent_seconds,
        status:            s.status,
        created_at:        s.created_at,
        // Truncate for list payloads; full essay comes from the report endpoint.
        essay_content:     essay.length > 280 ? `${essay.slice(0, 280)}…` : essay,
        overall_band:      r ? parseFloat(r.overall_band)   : null,
        response_band:     r ? parseFloat(r.response_band)  : null,
        coherence_band:    r ? parseFloat(r.coherence_band) : null,
        vocabulary_band:   r ? parseFloat(r.vocabulary_band): null,
        grammar_band:      r ? parseFloat(r.grammar_band)   : null,
      };
    });

    return res.json({ data: flattened, total: count || 0, page_count: flattened.length });
  } catch (err) {
    console.error('[submissions/list] unexpected:', err.message);
    return res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

module.exports = router;
