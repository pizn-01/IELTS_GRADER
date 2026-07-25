const { supabaseAdmin } = require('./supabase');

// Python mega-batch grading can take 1–3+ minutes. Anything still "grading"
// past this within a living process is almost certainly hung.
const STALE_GRADING_MS = Number(process.env.GRADING_STALE_MS || 6 * 60 * 1000);
const RECONCILE_INTERVAL_MS = Number(process.env.GRADING_RECONCILE_INTERVAL_MS || 60 * 1000);
// Process start — used so boot cleanup never touches submissions created after we came up.
const PROCESS_STARTED_AT = Date.now();

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

async function failGradingRows(rows, reason) {
  let failed = 0;
  for (const row of rows) {
    const ok = await failStuckSubmission(row.id, row.user_id, reason);
    if (ok) failed += 1;
  }
  return { checked: rows.length, failed };
}

/**
 * After a deploy/restart, in-process grading from the previous machine is gone.
 * Immediately fail+refund any grading rows created before this process started
 * (single-machine deployment — no other worker can still be grading them).
 */
async function reconcileBootOrphans() {
  const cutoff = new Date(PROCESS_STARTED_AT - 1000).toISOString();
  const { data: stuck, error } = await supabaseAdmin
    .from('submissions')
    .select('id, user_id, created_at')
    .eq('status', 'grading')
    .lt('created_at', cutoff)
    .limit(50);

  if (error) {
    console.error('[gradingReconcile] boot query failed:', error.message);
    return { checked: 0, failed: 0 };
  }
  if (!stuck || stuck.length === 0) {
    return { checked: 0, failed: 0 };
  }

  console.log(`[gradingReconcile] boot orphans found=${stuck.length}`);
  return failGradingRows(stuck, 'boot_orphan');
}

/**
 * Recover submissions stuck in grading longer than STALE_GRADING_MS (hung jobs).
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

  return failGradingRows(stuck, 'stale_grading');
}

function startGradingReconcile() {
  // Deploy/restart orphans first — don't wait for the 6–10 min stale window.
  setTimeout(() => {
    reconcileBootOrphans().catch((err) => {
      console.error('[gradingReconcile] boot tick failed:', err.message);
    });
  }, 3_000);

  setInterval(() => {
    reconcileStuckGrading().catch((err) => {
      console.error('[gradingReconcile] tick failed:', err.message);
    });
  }, RECONCILE_INTERVAL_MS);

  console.log(
    `[gradingReconcile] started staleMs=${STALE_GRADING_MS} intervalMs=${RECONCILE_INTERVAL_MS} bootOrphan=on`,
  );
}

module.exports = {
  refundOneCredit,
  failStuckSubmission,
  reconcileStuckGrading,
  reconcileBootOrphans,
  startGradingReconcile,
  STALE_GRADING_MS,
};
