const TAB_CHIPS_KEY = 'ig_first_report_tab_chips_seen';
const FIRST_FREE_DISCOVERY_KEY = 'ig_first_free_report_discovery_seen';
const REPORT_TABS_GUIDE_KEY = 'ig_report_tabs_guide_seen';
const DASHBOARD_TABS_GUIDE_KEY = 'ig_dashboard_tabs_guide_seen';
const UPGRADE_MODAL_PREFIX = 'ig_report_upgrade_modal_';
const NEXT_EXAM_MODAL_PREFIX = 'ig_report_next_exam_modal_';

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
    localStorage.setItem(REPORT_TABS_GUIDE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** First-visit report tab guide — migrates old discovery keys as already seen. */
export function hasSeenReportTabsGuide() {
  try {
    if (localStorage.getItem(REPORT_TABS_GUIDE_KEY) === '1') return true;
    if (localStorage.getItem(FIRST_FREE_DISCOVERY_KEY) === '1') return true;
    if (localStorage.getItem(TAB_CHIPS_KEY) === '1') return true;
    return false;
  } catch {
    return false;
  }
}

export function markReportTabsGuideSeen() {
  try {
    localStorage.setItem(REPORT_TABS_GUIDE_KEY, '1');
    localStorage.setItem(FIRST_FREE_DISCOVERY_KEY, '1');
    localStorage.setItem(TAB_CHIPS_KEY, '1');
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

function nextExamModalKey(reportId) {
  return `${NEXT_EXAM_MODAL_PREFIX}${reportId || 'session'}`;
}

export function hasDismissedNextExamModal(reportId) {
  try {
    return sessionStorage.getItem(nextExamModalKey(reportId)) === '1';
  } catch {
    return false;
  }
}

export function markNextExamModalDismissed(reportId) {
  try {
    sessionStorage.setItem(nextExamModalKey(reportId), '1');
  } catch {
    /* ignore */
  }
}
