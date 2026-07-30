import { api } from '../services/api';
import {
  hasSeenFirstDashboard,
  markFirstDashboardSeen,
} from './reportDiscoveryStorage';
import { igDebugLog } from './igDebugLog';

/**
 * True when the user has ≥1 graded exam and has not yet visited the dashboard
 * after having exam data (bridge before continuing practice).
 *
 * Do NOT auto-complete the bridge when examsCount ≥ 2 — that permanently skipped
 * the CTA for anyone who graded twice while testing. Only an actual dashboard
 * visit (or explicit first-dashboard flag) completes the bridge.
 */
export function needsDashboardBridge({ userId, examsCount }) {
  let reason = 'ok';
  let result = true;
  if (!userId) {
    reason = 'no_userId';
    result = false;
  } else if (examsCount == null || examsCount < 1) {
    reason = 'examsCount_lt_1';
    result = false;
  } else if (hasSeenFirstDashboard(userId)) {
    reason = 'first_dashboard_seen';
    result = false;
  }
  // #region agent log
  igDebugLog({
    hypothesisId: 'H3-examsGte2',
    location: 'dashboardBridge.js:needsDashboardBridge',
    message: 'needsDashboardBridge evaluated',
    data: { userId: userId || null, examsCount, result, reason },
    runId: 'post-fix',
  });
  // #endregion
  return result;
}

/** Count graded submissions (light fetch for entry gates). */
export async function fetchGradedExamCount() {
  try {
    const res = await api.getSubmissions({ limit: 5 });
    const rows = res?.data || [];
    const graded = rows.filter((s) => s.status === 'graded').length;
    if (graded > 0) return graded;
    if (res?.rateLimited || rows.length === 0) {
      try {
        const me = await api.getMe();
        const remaining = Number(me?.credits_remaining) || 0;
        const allowance = Number(me?.credits_allowance) || 0;
        if (allowance > 0 && remaining < allowance) {
          const used = allowance - remaining;
          return used >= 2 ? 2 : used >= 1 ? 1 : 0;
        }
      } catch {
        /* ignore */
      }
    }
    return graded;
  } catch {
    return 0;
  }
}

/**
 * If the authenticated user still needs the first-exam dashboard bridge,
 * navigate there and return true (caller should abort starting another exam).
 */
export async function redirectIfNeedsDashboardBridge({
  userId,
  navigate,
  examsCount = null,
  replace = true,
}) {
  if (!userId || typeof navigate !== 'function') return false;

  let count = examsCount;
  if (count == null) {
    count = await fetchGradedExamCount();
  }

  if (!needsDashboardBridge({ userId, examsCount: count })) return false;

  navigate('/dashboard', {
    state: { fromReportBridge: true },
    replace,
  });
  return true;
}

// re-export for callers that mark completion
export { markFirstDashboardSeen };
