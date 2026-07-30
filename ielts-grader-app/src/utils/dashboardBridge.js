import { api } from '../services/api';
import {
  hasSeenDashboardTabsGuide,
  hasSeenFirstDashboard,
  markFirstDashboardSeen,
} from './reportDiscoveryStorage';

/**
 * True when the user has ≥1 graded exam but has not yet visited the dashboard
 * (first-exam → dashboard bridge before free exam 2).
 */
export function needsDashboardBridge({ userId, examsCount }) {
  if (!userId) return false;
  if (examsCount == null || examsCount < 1) return false;
  if (examsCount >= 2) {
    // Migration: multi-exam users skip the bridge permanently.
    markFirstDashboardSeen(userId);
    return false;
  }
  if (hasSeenFirstDashboard(userId)) return false;
  // Migration: anyone who already completed the dashboard tab guide has been there.
  if (hasSeenDashboardTabsGuide()) {
    markFirstDashboardSeen(userId);
    return false;
  }
  return true;
}

/** Count graded submissions (light fetch for entry gates). */
export async function fetchGradedExamCount() {
  try {
    const res = await api.getSubmissions({ limit: 5 });
    const rows = res?.data || [];
    const graded = rows.filter((s) => s.status === 'graded').length;
    if (graded > 0) return graded;
    // Empty/rate-limited responses can look like 0 exams — fall back to credits used.
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
