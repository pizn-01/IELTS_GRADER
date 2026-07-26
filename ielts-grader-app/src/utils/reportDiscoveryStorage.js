const TAB_CHIPS_KEY = 'ig_first_report_tab_chips_seen';
const FIRST_FREE_DISCOVERY_KEY = 'ig_first_free_report_discovery_seen';
const UPGRADE_MODAL_PREFIX = 'ig_report_upgrade_modal_';

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
