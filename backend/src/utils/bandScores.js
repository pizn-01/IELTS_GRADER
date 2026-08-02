/**
 * Band score parsing / consistency for report inserts.
 * Never invent a mid-band (5.0) for missing values — that produced
 * overall=1 with criteria all 5 when overall came from 0/1 and criteria were absent.
 */

function parseBandOrNull(raw) {
  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return null;
  return Math.round(Math.min(9.0, Math.max(1.0, num)) * 2) / 2;
}

/** @deprecated Prefer sanitizeBandSet — NaN→5 hid missing criteria. */
function clampBand(raw) {
  const parsed = parseBandOrNull(raw);
  return parsed == null ? 5.0 : parsed;
}

/**
 * Finalize the five top-level bands before DB insert.
 * - Missing criteria inherit overall (or 1)
 * - Missing overall is averaged from present criteria
 * - All-criteria-exactly-5 with overall ≤ 2 is treated as the old NaN→5 artifact
 */
function sanitizeBandSet({
  overall_band,
  response_band,
  coherence_band,
  vocabulary_band,
  grammar_band,
} = {}) {
  let overall = parseBandOrNull(overall_band);
  let response = parseBandOrNull(response_band);
  let coherence = parseBandOrNull(coherence_band);
  let vocabulary = parseBandOrNull(vocabulary_band);
  let grammar = parseBandOrNull(grammar_band);

  const criteria = [response, coherence, vocabulary, grammar];
  const anyMissing = criteria.some((b) => b == null);

  if (anyMissing) {
    const fallback = overall ?? 1.0;
    response = response ?? fallback;
    coherence = coherence ?? fallback;
    vocabulary = vocabulary ?? fallback;
    grammar = grammar ?? fallback;
    if (overall == null) {
      overall = Math.round(((response + coherence + vocabulary + grammar) / 4) * 2) / 2;
    }
  } else if (overall == null) {
    overall = Math.round(((response + coherence + vocabulary + grammar) / 4) * 2) / 2;
  } else if (
    response === 5
    && coherence === 5
    && vocabulary === 5
    && grammar === 5
    && overall <= 2
  ) {
    // Legacy clampBand(NaN)→5.0 paired with a floored overall (0→1).
    response = coherence = vocabulary = grammar = overall;
  }

  return {
    overall_band: overall,
    response_band: response,
    coherence_band: coherence,
    vocabulary_band: vocabulary,
    grammar_band: grammar,
  };
}

/** Too short / placeholder text — not a real IELTS attempt. */
function isNonAnswerEssay(essay) {
  const text = String(essay || '').trim();
  if (!text) return true;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 5) return true;
  if (text.length <= 15) return true;
  return false;
}

function buildNonAnswerGradeResult() {
  return {
    overall_band: 1.0,
    response_band: 1.0,
    coherence_band: 1.0,
    vocabulary_band: 1.0,
    grammar_band: 1.0,
    strengths: [],
    weaknesses: [
      'This response is too short or incomplete to demonstrate IELTS Writing skills.',
      'Submit a full answer that addresses the task with developed ideas and supporting details.',
    ],
    high_impact_fixes: [
      'Write a complete response that addresses the task with developed ideas and supporting details.',
      'Aim for the IELTS word count (Task 1: 150+, Task 2: 250+) before submitting.',
    ],
    errors: [],
    sub_category_scores: {},
    model_answer: null,
    vocabulary_analysis: null,
    grammar_analysis: null,
    data_structure_analysis: null,
    argumentation_analysis: null,
    letter_structure_analysis: null,
    flow_logic_analysis: null,
    secondary_bands: null,
  };
}

module.exports = {
  parseBandOrNull,
  clampBand,
  sanitizeBandSet,
  isNonAnswerEssay,
  buildNonAnswerGradeResult,
};
