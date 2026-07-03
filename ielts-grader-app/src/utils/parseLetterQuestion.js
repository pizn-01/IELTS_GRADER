const BULLET_RE = /^(?:[-*•–—]|\d+[.):–]|[a-zA-Z][.):–])\s+\S/u;
const STRIP_MARKER = /^(?:[-*•–—]|\d+[.):–]|[a-zA-Z][.):–])\s+/u;
const SKIP_RE = /write at least|you should spend|begin your letter|you do not need/i;
const IN_YOUR_LETTER_RE = /^in your letter:?$/i;

export function isGeneralTask1Letter(examType, taskType) {
  return examType === 'General' && String(taskType || '').includes('1');
}

/**
 * Parse General Task 1 letter question text for display.
 * Mirrors ImportedQuestionAnalyzer bullet detection so UI matches grader input.
 */
export function parseLetterQuestion(text) {
  if (!text?.trim()) return { scenario: '', bullets: [] };

  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const markerIdx = lines.findIndex((line) => IN_YOUR_LETTER_RE.test(line));
  const scenarioLines = (markerIdx >= 0 ? lines.slice(0, markerIdx) : lines).filter(
    (line) => !SKIP_RE.test(line) && !/^opening line:/i.test(line) && !line.toLowerCase().startsWith('dear ')
  );
  const bodyLines = markerIdx >= 0 ? lines.slice(markerIdx + 1) : [];

  const bullets = [];
  for (const line of bodyLines) {
    if (SKIP_RE.test(line) || /^opening line:/i.test(line)) continue;
    if (line.toLowerCase().startsWith('dear ')) continue;

    if (BULLET_RE.test(line)) {
      const clean = line.replace(STRIP_MARKER, '').trim();
      if (clean.split(/\s+/).length >= 2) bullets.push(clean);
    } else if (line.split(/\s+/).length >= 3) {
      bullets.push(line);
    }
    if (bullets.length >= 5) break;
  }

  const scenario = scenarioLines.join(' ').trim() || lines[0] || '';
  return { scenario, bullets };
}
