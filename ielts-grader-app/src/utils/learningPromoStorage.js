const PREFIX = 'ielts_learning_edition_seen_';

function key(userId, editionNumber) {
  return `${PREFIX}${userId || 'anon'}_${editionNumber}`;
}

export function hasSeenEdition(userId, editionNumber) {
  try {
    return localStorage.getItem(key(userId, editionNumber)) === '1';
  } catch {
    return false;
  }
}

export function markEditionSeen(userId, editionNumber) {
  try {
    localStorage.setItem(key(userId, editionNumber), '1');
  } catch {
    /* ignore */
  }
}

/** Edition N unlocks when totalGraded === N * 5 */
export function editionForExamCount(totalGraded) {
  if (!totalGraded || totalGraded % 5 !== 0) return null;
  return totalGraded / 5;
}

export function findUnseenUnlockedEdition(learningStatus, userId) {
  if (!learningStatus || !userId) return null;
  const max = learningStatus.maxUnlockedEdition || 0;
  for (let n = 1; n <= max; n += 1) {
    if (!hasSeenEdition(userId, n)) {
      const edition = learningStatus.editions?.find((e) => e.editionNumber === n);
      if (edition?.unlocked) return edition;
    }
  }
  return null;
}

export function hasPreviewPendingEdition(learningStatus) {
  return (learningStatus?.editions || []).some((e) => e.unlocked && e.status === 'preview');
}
