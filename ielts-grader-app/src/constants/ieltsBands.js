export const IELTS_BAND_OPTIONS = [];
for (let band = 5.0; band <= 9.0; band += 0.5) {
  IELTS_BAND_OPTIONS.push(Math.round(band * 10) / 10);
}

export const IELTS_BAND_QUICK_PICKS = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

export const DEFAULT_TARGET_BAND = 7.5;
