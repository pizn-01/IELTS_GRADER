const { supabaseAdmin } = require('./supabase');

// Python mega-batch grading can take 1–3+ minutes. Anything still "grading"
// past this is almost certainly orphaned (deploy kill, OOM, hung child).
const STALE_GRADING_MS = Number(process.env.GRADING_STALE_MS || 10 * 60 * 1000);
const RECONCILE_INTERVAL_MS = Number(process.env.GRADING_RECONCILE_INTERVAL_MS || 60 * 1000);

/**
 * Refund exactly one credit by incrementing current balance.
 * Avoids the old absolute original_credits snapshot which could clobber
 * concurrent deductions/refunds.
 */
async function refundOneCredit(userId) {
  if (!userId) return false;
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .single();
  if (error || !profile) {
    console.error('[gradingReconcile] refund profile read failed:', error?.message);
    return false;
  }
  const next = (profile.credits_remaining ?? 0) + 1;
  const { error: upErr } = await supabaseAdmin
    .from('profiles')
    .update({ credits_remaining: next })
    .eq('id', userId)
    .eq('credits_remaining', profile.credits_remaining);
  if (upErr) {
    console.error('[gradingReconcile] refund update failed:', upErr.message);
    return false;
  }
  return true;
}

/**
 * Mark a submission failed only if it is still grading, then refund 1 credit.
 * Returns true when the row transitioned grading → failed.
 */
async function failStuckSubmission(submissionId, userId, reason) {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .update({ status: 'failed' })
    .eq('id', submissionId)
    .eq('status', 'grading')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[gradingReconcile] fail update failed id=${submissionId}:`, error.message);
    return false;
  }
  if (!data) {
    // Already graded/failed — another path won the race
    return false;
  }

  const refunded = await refundOneCredit(userId);
  console.log(
    `[gradingReconcile] marked failed id=${submissionId} reason=${reason} refunded=${refunded}`,
  );

  return true;
}

/**
 * Recover submissions stuck in grading longer than STALE_GRADING_MS.
 */
async function reconcileStuckGrading() {
  const cutoff = new Date(Date.now() - STALE_GRADING_MS).toISOString();
  const { data: stuck, error } = await supabaseAdmin
    .from('submissions')
    .select('id, user_id, created_at')
    .eq('status', 'grading')
    .lt('created_at', cutoff)
    .limit(50);

  if (error) {
    console.error('[gradingReconcile] query failed:', error.message);
    return { checked: 0, failed: 0 };
  }
  if (!stuck || stuck.length === 0) {
    return { checked: 0, failed: 0 };
  }

  let failed = 0;
  for (const row of stuck) {
    const ok = await failStuckSubmission(row.id, row.user_id, 'stale_grading');
    if (ok) failed += 1;
  }
  return { checked: stuck.length, failed };
}

function startGradingReconcile() {
  const run = () => {
    reconcileStuckGrading().catch((err) => {
      console.error('[gradingReconcile] tick failed:', err.message);
    });
  };
  // Run once shortly after boot so already-stuck rows (e.g. 41a38e3e) recover.
  setTimeout(run, 5_000);
  setInterval(run, RECONCILE_INTERVAL_MS);
  console.log(
    `[gradingReconcile] started staleMs=${STALE_GRADING_MS} intervalMs=${RECONCILE_INTERVAL_MS}`,
  );
}

module.exports = {
  refundOneCredit,
  failStuckSubmission,
  reconcileStuckGrading,
  startGradingReconcile,
  STALE_GRADING_MS,
};
