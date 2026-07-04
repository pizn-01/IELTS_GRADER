/**
 * If text has no paragraph breaks but uses sentence-ending + double spaces
 * (common OCR / single-line paste artifact), convert those to newlines.
 * Leave text that already has clear newlines unchanged.
 */
export function normalizeParagraphBreaks(text) {
  if (!text || !String(text).trim()) return text || '';
  const s = String(text);
  if (s.includes('\n\n') || (s.match(/\n/g) || []).length >= 2) {
    return s;
  }
  return s.replace(/([.!?])[ \t]{2,}/g, '$1\n\n');
}
