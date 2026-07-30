const TAB_CHIPS_KEY = 'ig_first_report_tab_chips_seen';
const FIRST_FREE_DISCOVERY_KEY = 'ig_first_free_report_discovery_seen';
/** v2 — do not migrate from old discovery keys (those were often marked seen while invisible). */
const REPORT_TABS_GUIDE_KEY = 'ig_report_tabs_guide_v3_seen';
const DASHBOARD_TABS_GUIDE_KEY = 'ig_dashboard_tabs_guide_v3_seen';
const FIRST_DASHBOARD_PREFIX = 'ig_first_dashboard_seen_v2_';
const UPGRADE_MODAL_PREFIX = 'ig_report_upgrade_modal_';

function firstDashboardKey(userId) {
  return `${FIRST_DASHBOARD_PREFIX}${userId || 'anon'}`;
}

/** Legacy chip flag — treat as already-seen for migration. */
export function hasSeenFirstReportTabChips() {
  try {
    return localStorage.getItem(TAB_CHIPS_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFirstReportTabChipsSeen() {
  try {
    localStorage.setItem(TAB_CHIPS_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasSeenFirstFreeReportDiscovery() {
  try {
    if (localStorage.getItem(FIRST_FREE_DISCOVERY_KEY) === '1') return true;
    // Migrate: users who already saw the old chip row are not re-nagged.
    return localStorage.getItem(TAB_CHIPS_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFirstFreeReportDiscoverySeen() {
  try {
    localStorage.setItem(FIRST_FREE_DISCOVERY_KEY, '1');
    localStorage.setItem(TAB_CHIPS_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** First-visit report tab guide — v2 key only (no legacy false-positives). */
export function hasSeenReportTabsGuide() {
  try {
    return localStorage.getItem(REPORT_TABS_GUIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markReportTabsGuideSeen() {
  try {
    localStorage.setItem(REPORT_TABS_GUIDE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasSeenDashboardTabsGuide() {
  try {
    return localStorage.getItem(DASHBOARD_TABS_GUIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDashboardTabsGuideSeen() {
  try {
    localStorage.setItem(DASHBOARD_TABS_GUIDE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** First post-exam dashboard visit — user-scoped. */
export function hasSeenFirstDashboard(userId) {
  if (!userId) return false;
  try {
    return localStorage.getItem(firstDashboardKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markFirstDashboardSeen(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(firstDashboardKey(userId), '1');
  } catch {
    /* ignore */
  }
}

function upgradeModalKey(reportId) {
  return `${UPGRADE_MODAL_PREFIX}${reportId || 'session'}`;
}

export function hasDismissedReportUpgradeModal(reportId) {
  try {
    return sessionStorage.getItem(upgradeModalKey(reportId)) === '1';
  } catch {
    return false;
  }
}

export function markReportUpgradeModalDismissed(reportId) {
  try {
    sessionStorage.setItem(upgradeModalKey(reportId), '1');
  } catch {
    /* ignore */
  }
}
