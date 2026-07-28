/**
 * Improved model answer must display ≥ candidate overall + 0.5 (capped at 9).
 * Keep in sync with backend/src/utils/modelAnswerBand.js
 */
export function elevateModelBand(estimatedBand, candidateOverall) {
  const clampHalf = (raw) => {
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) return null;
    const clamped = Math.min(9.0, Math.max(1.0, num));
    return Math.round(clamped * 2) / 2;
  };
  const candidate = clampHalf(candidateOverall);
  const estimated = clampHalf(estimatedBand);
  if (candidate == null && estimated == null) return 8.0;
  if (candidate == null) return estimated;
  const minTarget = Math.min(9.0, clampHalf(candidate + 0.5));
  if (estimated == null) return minTarget;
  return Math.max(estimated, minTarget);
}
