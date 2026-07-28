/**
 * Detect answers that mostly restate the exam prompt / UI chrome instead of
 * answering the task. Used to short-circuit grading that otherwise invents
 * chart-analysis praise for pasted questions.
 */
function normalizeForCompare(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.%µμ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikePromptCopy(essay, questionText = '') {
  const essayNorm = normalizeForCompare(essay);
  if (!essayNorm || essayNorm.length < 40) return false;

  // Pasted mock UI chrome + Task 1 instructions
  if (
    /you should spend about \d+ minutes on this task/.test(essayNorm)
    && /(summarise the information|write at least \d+ words|graph below|chart below|table below|map below)/.test(essayNorm)
  ) {
    return true;
  }

  const questionNorm = normalizeForCompare(questionText);
  if (!questionNorm || questionNorm.length < 40) return false;

  const questionCore = questionNorm
    .replace(/write at least \d+ words\.?/g, '')
    .replace(/you should spend about \d+ minutes on this task\.?/g, '')
    .trim();

  if (questionCore.length >= 60) {
    const needle = questionCore.slice(0, Math.min(140, questionCore.length));
    if (needle && essayNorm.includes(needle)) return true;
  }

  const essayWords = new Set(essayNorm.split(' ').filter((w) => w.length > 3));
  const questionWords = [...new Set(questionNorm.split(' ').filter((w) => w.length > 3))];
  if (questionWords.length < 8) return false;
  const overlap = questionWords.filter((w) => essayWords.has(w)).length;
  const overlapRatio = overlap / questionWords.length;
  const lengthRatio = essayNorm.length / Math.max(questionNorm.length, 1);
  return overlapRatio >= 0.72 && lengthRatio <= 1.4;
}

function buildPromptCopyGradeResult(taskVariant = 'task1-report') {
  const isReport = taskVariant === 'task1-report';
  return {
    overall_band: 2.0,
    response_band: 1.0,
    coherence_band: 2.0,
    vocabulary_band: 2.0,
    grammar_band: 2.0,
    strengths: [],
    weaknesses: isReport
      ? [
          'The submission largely copies the question prompt instead of describing the chart.',
          'There is no candidate analysis of trends, figures, or comparisons from the visual.',
          'Task Achievement cannot be credited when the answer restates instructions rather than reporting data.',
        ]
      : [
          'The submission largely copies the question prompt instead of answering the task.',
          'There is little or no original candidate content to assess against the prompt.',
        ],
    high_impact_fixes: isReport
      ? [
          'Write your own overview and body paragraphs using specific figures from the chart.',
          'Do not paste the question text or on-screen instructions into the answer box.',
        ]
      : [
          'Write an original response that answers every part of the question in your own words.',
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
    prompt_copy_detected: true,
  };
}

module.exports = {
  looksLikePromptCopy,
  buildPromptCopyGradeResult,
};
