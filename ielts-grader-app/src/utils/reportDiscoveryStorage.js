const TAB_CHIPS_KEY = 'ig_first_report_tab_chips_seen';
const UPGRADE_MODAL_PREFIX = 'ig_report_upgrade_modal_';

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
