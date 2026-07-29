const { supabaseAdmin } = require('./supabase');

// Must exceed PYTHON_GRADING_TIMEOUT_MS (default 8m) so a live child is never
// treated as abandoned. After this window with no in-process job, we regrade.
const STALE_GRADING_MS = Number(process.env.GRADING_STALE_MS || 15 * 60 * 1000);
const RECONCILE_INTERVAL_MS = Number(process.env.GRADING_RECONCILE_INTERVAL_MS || 60 * 1000);
const REGRADE_DELAY_MS = Number(process.env.GRADING_REGRADE_DELAY_MS || 20 * 1000);
// Mega-batch Python graders are memory-heavy — never run more than one at a time
// on the Fly VM (even at 2GB concurrent batches caused OOMs at 512MB).
const MAX_CONCURRENT_GRADING = Number(process.env.GRADING_MAX_CONCURRENT || 1);
// Process start — boot requeue only touches submissions created before we came up.
const PROCESS_STARTED_AT = Date.now();

// Shared across python + JS engines so reconciler never double-starts a job.
const inflightGrading = new Map(); // submissionId -> { startedAt, scriptName, userId }

/**
 * Claim an in-process grading slot.
 * @returns {'ok'|'duplicate'|'busy'}
 */
function beginGrading(submissionId, meta = {}) {
  if (!submissionId) return 'busy';
  if (inflightGrading.has(submissionId)) return 'duplicate';
  if (inflightGrading.size >= MAX_CONCURRENT_GRADING) return 'busy';
  inflightGrading.set(submissionId, {
    startedAt: Date.now(),
    scriptName: meta.scriptName || null,
    userId: meta.userId || null,
  });
  return 'ok';
}

function touchGrading(submissionId, patch = {}) {
  const meta = inflightGrading.get(submissionId);
  if (!meta) return;
  Object.assign(meta, patch);
}

function endGrading(submissionId) {
  inflightGrading.delete(submissionId);
}

function isGradingInflight(submissionId) {
  return inflightGrading.has(submissionId);
}

function listInflightGrading() {
  return [...inflightGrading.entries()].map(([id, meta]) => ({
    submissionId: id,
    userId: meta.userId,
    scriptName: meta.scriptName,
    ageMs: Date.now() - meta.startedAt,
  }));
}

/**
 * Refund exactly one credit by incrementing current balance.
 * Kept for rare permanent abandon paths / admin tools — normal grading no longer refunds on transient failure.
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
 * Legacy helper — mark failed + refund. Prefer requeueGrading for transient errors.
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
  if (!data) return false;

  const refunded = await refundOneCredit(userId);
  console.log(
    `[gradingReconcile] marked failed id=${submissionId} reason=${reason} refunded=${refunded}`,
  );
  return true;
}

async function loadSubmissionForRegrade(submissionId) {
  let data;
  let error;
  {
    const withQ = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, exam_type, task_type, essay_content, exam_task_id, question_text, status')
      .eq('id', submissionId)
      .maybeSingle();
    if (withQ.error && /question_text/i.test(withQ.error.message || '')) {
      const withoutQ = await supabaseAdmin
        .from('submissions')
        .select('id, user_id, exam_type, task_type, essay_content, exam_task_id, status')
        .eq('id', submissionId)
        .maybeSingle();
      data = withoutQ.data;
      error = withoutQ.error;
    } else {
      data = withQ.data;
      error = withQ.error;
    }
  }
  if (error) {
    console.error(`[gradingReconcile] load failed id=${submissionId}:`, error.message);
    return null;
  }
  return data;
}

async function hasReport(submissionId) {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('id')
    .eq('submission_id', submissionId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`[gradingReconcile] report check failed id=${submissionId}:`, error.message);
    return false;
  }
  return Boolean(data?.id);
}

/**
 * Ensure status is grading and kick gradeEssayAsync. Safe to call repeatedly —
 * beginGrading / already-graded / existing report short-circuit duplicates.
 */
async function requeueGrading(submissionId, reason = 'requeue') {
  if (!submissionId) return false;
  if (isGradingInflight(submissionId)) {
    console.log(`[gradingReconcile] skip requeue id=${submissionId} reason=${reason} (inflight)`);
    return false;
  }

  if (await hasReport(submissionId)) {
    await supabaseAdmin
      .from('submissions')
      .update({ status: 'graded' })
      .eq('id', submissionId)
      .in('status', ['grading', 'failed', 'pending']);
    console.log(`[gradingReconcile] already has report id=${submissionId} — marked graded`);
    return false;
  }

  const row = await loadSubmissionForRegrade(submissionId);
  if (!row) return false;
  if (row.status === 'graded') return false;

  if (row.status !== 'grading') {
    const { data: claimed, error } = await supabaseAdmin
      .from('submissions')
      .update({ status: 'grading' })
      .eq('id', submissionId)
      .eq('status', row.status)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error(`[gradingReconcile] claim failed id=${submissionId}:`, error.message);
      return false;
    }
    if (!claimed) {
      console.log(`[gradingReconcile] skip requeue id=${submissionId} (claim lost)`);
      return false;
    }
  }

  console.log(`[gradingReconcile] requeue id=${submissionId} reason=${reason}`);

  // Lazy require avoids circular load with graderEngine → pythonGrader → this file.
  const { gradeEssayAsync } = require('./graderEngine');
  gradeEssayAsync(row.id, {
    exam_type: row.exam_type,
    task_type: row.task_type,
    essay_content: row.essay_content,
    exam_task_id: row.exam_task_id || null,
    question_text: row.question_text || '',
    userId: row.user_id,
  }).catch((err) => {
    console.error(`[gradingReconcile] requeue grade failed id=${submissionId}:`, err.message);
  });

  return true;
}

function scheduleRegrade(submissionId, reason = 'delayed_retry', delayMs = REGRADE_DELAY_MS) {
  if (!submissionId) return;
  const wait = Math.max(0, Number(delayMs) || REGRADE_DELAY_MS);
  console.log(`[gradingReconcile] schedule regrade id=${submissionId} in ${wait}ms reason=${reason}`);
  setTimeout(() => {
    requeueGrading(submissionId, reason).catch((err) => {
      console.error(`[gradingReconcile] scheduled regrade failed id=${submissionId}:`, err.message);
    });
  }, wait);
}

async function requeueRows(rows, reason) {
  let queued = 0;
  for (const row of rows) {
    if (inflightGrading.size >= MAX_CONCURRENT_GRADING) {
      console.log(
        `[gradingReconcile] concurrency full (${MAX_CONCURRENT_GRADING}) — deferring remaining requeues`,
      );
      break;
    }
    const ok = await requeueGrading(row.id, reason);
    if (ok) queued += 1;
  }
  return { checked: rows.length, queued };
}

/**
 * After deploy/restart/OOM, previous in-process work is gone.
 * Re-grade anything still "grading" from before this process started.
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
    return { checked: 0, queued: 0 };
  }
  if (!stuck || stuck.length === 0) {
    return { checked: 0, queued: 0 };
  }

  console.log(`[gradingReconcile] boot orphans found=${stuck.length} — requeueing`);
  return requeueRows(stuck, 'boot_orphan');
}

/**
 * Recover submissions stuck in grading with no live in-process job.
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
    console.error('[gradingReconcile] stale query failed:', error.message);
    return { checked: 0, queued: 0 };
  }
  if (!stuck || stuck.length === 0) {
    return { checked: 0, queued: 0 };
  }

  const abandoned = stuck.filter((row) => !isGradingInflight(row.id));
  if (abandoned.length === 0) {
    return { checked: stuck.length, queued: 0 };
  }

  console.log(`[gradingReconcile] stale abandoned=${abandoned.length}/${stuck.length} — requeueing`);
  return requeueRows(abandoned, 'stale_grading');
}

/**
 * Past failures (OOM era) with no report — reclaim and grade until the user gets results.
 */
async function reconcileFailedWithoutReport() {
  const { data: failed, error } = await supabaseAdmin
    .from('submissions')
    .select('id, user_id, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[gradingReconcile] failed query failed:', error.message);
    return { checked: 0, queued: 0 };
  }
  if (!failed || failed.length === 0) {
    return { checked: 0, queued: 0 };
  }

  const needs = [];
  for (const row of failed) {
    if (isGradingInflight(row.id)) continue;
    if (await hasReport(row.id)) {
      await supabaseAdmin.from('submissions').update({ status: 'graded' }).eq('id', row.id);
      continue;
    }
    needs.push(row);
  }

  if (needs.length === 0) {
    return { checked: failed.length, queued: 0 };
  }

  console.log(`[gradingReconcile] failed-without-report=${needs.length} — requeueing`);
  return requeueRows(needs, 'failed_retry');
}

function startGradingReconcile() {
  setTimeout(() => {
    reconcileBootOrphans()
      .then(() => reconcileFailedWithoutReport())
      .catch((err) => {
        console.error('[gradingReconcile] boot tick failed:', err.message);
      });
  }, 3_000);

  setInterval(() => {
    reconcileStuckGrading()
      .then(() => reconcileFailedWithoutReport())
      .catch((err) => {
        console.error('[gradingReconcile] tick failed:', err.message);
      });
  }, RECONCILE_INTERVAL_MS);

  console.log(
    `[gradingReconcile] started staleMs=${STALE_GRADING_MS} intervalMs=${RECONCILE_INTERVAL_MS} maxConcurrent=${MAX_CONCURRENT_GRADING} bootRequeue=on failedRetry=on`,
  );
}

module.exports = {
  refundOneCredit,
  failStuckSubmission,
  requeueGrading,
  scheduleRegrade,
  reconcileStuckGrading,
  reconcileBootOrphans,
  reconcileFailedWithoutReport,
  startGradingReconcile,
  beginGrading,
  touchGrading,
  endGrading,
  isGradingInflight,
  listInflightGrading,
  STALE_GRADING_MS,
};
