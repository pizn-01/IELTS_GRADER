const PREFIX = 'ielts_sprint_';

function storageKey(userId, taskKey) {
  return `${PREFIX}${userId || 'anon'}_${taskKey || 'all'}`;
}

function parseDateOnly(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar day of sprint: 1 on start date, +1 each day, no cap. */
export function sprintDayNumber(startedAt) {
  if (!startedAt) return null;
  const start = parseDateOnly(startedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export function isSprintActive(record) {
  if (!record?.startedAt) return false;
  return sprintDayNumber(record.startedAt) <= 14;
}

export function isSprintComplete(record) {
  if (!record?.startedAt) return false;
  return sprintDayNumber(record.startedAt) > 14;
}

export function loadSprint(userId, taskKey) {
  try {
    const raw = localStorage.getItem(storageKey(userId, taskKey));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSprint(userId, taskKey, record) {
  try {
    localStorage.setItem(storageKey(userId, taskKey), JSON.stringify(record));
  } catch {
    // ignore quota errors
  }
}

export function clearSprint(userId, taskKey) {
  try {
    localStorage.removeItem(storageKey(userId, taskKey));
  } catch {
    // ignore
  }
}

export function startSprint(userId, taskKey, plan) {
  const startedAt = new Date().toISOString().slice(0, 10);
  const record = { startedAt, plan };
  saveSprint(userId, taskKey, record);
  return record;
}
