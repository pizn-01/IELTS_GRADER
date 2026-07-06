export function formatGoalGap(latestBand, targetBand) {
  if (latestBand == null || targetBand == null) return '—';
  if (latestBand >= targetBand) return 'Target Reached';
  return `+${(targetBand - latestBand).toFixed(1)}`;
}

export function goalProgressPercent(latestBand, targetBand) {
  if (latestBand == null || !targetBand) return 0;
  return Math.min(100, Math.round((latestBand / targetBand) * 100));
}

export function goalStatusText(latestBand, targetBand) {
  if (latestBand == null) return 'Complete your first exam to track progress toward your goal.';
  if (latestBand >= targetBand) {
    return `You've reached your target of Band ${targetBand.toFixed(1)}. Keep practicing to stay consistent.`;
  }
  const gap = (targetBand - latestBand).toFixed(1);
  return `You're ${gap} band point${gap === '1.0' ? '' : 's'} away from your goal of Band ${targetBand.toFixed(1)}. Focus on your weakest criterion to close the gap.`;
}
