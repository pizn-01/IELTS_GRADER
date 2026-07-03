const CHART_PLACEHOLDER_RE = /\s*\[chart image provided\]\s*/gi;
const SUMMARISE_RE = /Summarise the information by selecting and reporting the main features,?\s*and make comparisons where relevant\.?/i;
const WRITE_WORDS_RE = /Write at least \d+\s*words\.?/i;

const DEFAULT_INSTRUCTION =
  'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.';

export function isAcademicTask1Report(examType, taskType) {
  return examType === 'Academic' && String(taskType || '').includes('1');
}

/**
 * Parse Academic Task 1 report question text for display.
 * Separates the scenario (what the chart shows) from the standard
 * "Summarise the information..." instruction so the UI isn't a wall of text.
 */
export function parseReportQuestion(text) {
  if (!text?.trim()) return { scenario: '', instruction: DEFAULT_INSTRUCTION };

  let cleaned = text.replace(CHART_PLACEHOLDER_RE, ' ');

  let instruction = DEFAULT_INSTRUCTION;
  const summariseMatch = cleaned.match(SUMMARISE_RE);
  if (summariseMatch) {
    instruction = summariseMatch[0].trim();
    if (!/[.!?]$/.test(instruction)) instruction += '.';
    cleaned = cleaned.replace(summariseMatch[0], ' ');
  }

  cleaned = cleaned.replace(WRITE_WORDS_RE, ' ');

  const scenario = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();

  return { scenario, instruction };
}
