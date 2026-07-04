/**
 * Shared normalizers for IELTS question-bank JSON → exam_tasks rows.
 * Used by admin import and manual create endpoints.
 */

const SVG_RE = /<svg[\s\S]*?<\/svg>/i;
const TITLE_MAX = 60;

const REPORT_FOOTER = [
  'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '',
  'Write at least 150 words.',
].join('\n');

const TASK2_FOOTER = 'Write at least 250 words.';

function truncateTitle(text, maxLen = TITLE_MAX) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 3).trim()}...`;
}

function buildTitle(prefix, body) {
  const p = (prefix || '').trim();
  const b = truncateTitle(body);
  if (p && b) return `${p} — ${b}`;
  return p || b || 'Question';
}

function dedupeTitle(title, seenSet) {
  let candidate = title;
  let n = 2;
  while (seenSet.has(candidate)) {
    candidate = `${title} (${n})`;
    n += 1;
  }
  seenSet.add(candidate);
  return candidate;
}

function timeLimitFor(taskType) {
  return taskType === 'Task 1' ? 1200 : 2400;
}

function extractSvg(prompt) {
  const raw = prompt || '';
  const m = raw.match(SVG_RE);
  if (!m) return { cleanPrompt: raw.trim(), chartSvg: null };
  const chartSvg = m[0];
  const cleanPrompt = raw.replace(SVG_RE, '').replace(/\s+/g, ' ').trim();
  return { cleanPrompt, chartSvg };
}

function ensureFooter(text, footer) {
  const t = (text || '').trim();
  if (!t) return footer;
  if (t.toLowerCase().includes(footer.split('\n')[0].toLowerCase().slice(0, 20))) return t;
  return `${t}\n\n${footer}`;
}

/**
 * @param {object} item
 * @returns {'task2'|'report'|'letter'|'internal'|'unknown'}
 */
function detectBankFormat(item) {
  if (!item || typeof item !== 'object') return 'unknown';
  if (item.exam_type && item.task_type && item.question_text) return 'internal';
  if (item.prompt && item['chart-type']) return 'report';
  if (item.prompt && (item['letter-type'] || item['bullet-points'])) return 'letter';
  if (item.question) return 'task2';
  return 'unknown';
}

/**
 * Infer exam/task type from first JSON item (for auto-detect UI).
 */
function inferExamTaskType(item) {
  const fmt = detectBankFormat(item);
  if (fmt === 'report') return { exam_type: 'Academic', task_type: 'Task 1', format: fmt };
  if (fmt === 'letter') return { exam_type: 'General', task_type: 'Task 1', format: fmt };
  if (fmt === 'task2') return { exam_type: 'Academic', task_type: 'Task 2', format: fmt };
  if (fmt === 'internal') {
    return {
      exam_type: item.exam_type,
      task_type: item.task_type,
      format: fmt,
    };
  }
  return { exam_type: null, task_type: null, format: fmt };
}

function normalizeTask2(item, examType = 'Academic') {
  const et = ['Academic', 'General'].includes(examType) ? examType : 'Academic';
  const topicStr = [item.topic, item.type].filter(Boolean).join(' — ');
  const questionBody = (item.question || '').trim();
  const title = topicStr || truncateTitle(questionBody) || 'Question';
  const question_text = ensureFooter(questionBody, TASK2_FOOTER);
  return {
    exam_type: et,
    task_type: 'Task 2',
    title,
    question_text,
    time_limit_seconds: 2400,
    chart_svg: null,
    is_active: true,
  };
}

function normalizeLetter(item) {
  const bullets = Array.isArray(item['bullet-points']) ? item['bullet-points'] : [];
  const numbered = bullets
    .map((b, i) => `${i + 1}. ${String(b).trim()}`)
    .join('\n');
  const prompt = (item.prompt || '').trim();
  const parts = [prompt];
  if (numbered) {
    parts.push('', 'In your letter:', numbered);
  }
  const question_text = parts.join('\n').trim();
  const letterType = item['letter-type'] || 'Letter';
  const title = buildTitle(`Letter (${letterType})`, prompt);
  return {
    exam_type: 'General',
    task_type: 'Task 1',
    title,
    question_text,
    time_limit_seconds: 1200,
    chart_svg: null,
    is_active: true,
  };
}

function normalizeReport(item) {
  const { cleanPrompt, chartSvg } = extractSvg(item.prompt || '');
  const chartType = item['chart-type'] || 'Chart';
  const title = buildTitle(chartType, cleanPrompt);
  const question_text = ensureFooter(cleanPrompt, REPORT_FOOTER);
  return {
    exam_type: 'Academic',
    task_type: 'Task 1',
    title,
    question_text,
    chart_svg: chartSvg,
    time_limit_seconds: 1200,
    is_active: true,
  };
}

function normalizeInternal(item) {
  return {
    exam_type: item.exam_type,
    task_type: item.task_type,
    title: (item.title || 'Question').trim().slice(0, 255),
    question_text: item.question_text.trim(),
    chart_svg: item.chart_svg || null,
    time_limit_seconds: item.time_limit_seconds || timeLimitFor(item.task_type),
    is_active: item.is_active !== false,
  };
}

/**
 * Normalize a manual create payload from the admin New Task form.
 */
function normalizeCreatePayload(body) {
  const {
    exam_type,
    task_type,
    question_text,
    chart_svg,
    topic,
    type: task2Type,
    letter_type,
    bullet_points,
    prompt,
  } = body;

  if (!exam_type || !task_type) {
    throw new Error('exam_type and task_type are required.');
  }

  // Academic Task 1 report
  if (exam_type === 'Academic' && task_type === 'Task 1') {
    const rawPrompt = (prompt || question_text || '').trim();
    if (!rawPrompt && !chart_svg) throw new Error('Prompt is required.');
    let cleanPrompt = rawPrompt;
    let svg = chart_svg || null;
    if (rawPrompt && SVG_RE.test(rawPrompt)) {
      const extracted = extractSvg(rawPrompt);
      cleanPrompt = extracted.cleanPrompt;
      svg = svg || extracted.chartSvg;
    }
    const chartType = body.chart_type || 'Chart';
    return normalizeReport({
      'chart-type': chartType,
      prompt: svg ? `${cleanPrompt}${svg}` : cleanPrompt,
    });
  }

  // General Task 1 letter
  if (exam_type === 'General' && task_type === 'Task 1') {
    const scenario = (prompt || question_text || '').trim();
    if (!scenario) throw new Error('Letter scenario/prompt is required.');
    const bullets = Array.isArray(bullet_points)
      ? bullet_points.filter(Boolean)
      : [];
    return normalizeLetter({
      prompt: scenario,
      'letter-type': letter_type || 'Formal',
      'bullet-points': bullets,
    });
  }

  // Task 2
  const q = (question_text || prompt || '').trim();
  if (!q) throw new Error('Question text is required.');
  return normalizeTask2(
    { topic, type: task2Type, question: q },
    exam_type,
  );
}

/**
 * Normalize one raw JSON bank item.
 * @param {object} item
 * @param {{ exam_type?: string, task_type?: string, seenTitles?: Set }} opts
 * @returns {{ row: object|null, error: string|null }}
 */
function normalizeBankItem(item, opts = {}) {
  const fmt = detectBankFormat(item);
  let row = null;

  if (fmt === 'internal') {
    if (!['Academic', 'General'].includes(item.exam_type)) {
      return { row: null, error: `invalid exam_type "${item.exam_type}"` };
    }
    if (!['Task 1', 'Task 2'].includes(item.task_type)) {
      return { row: null, error: `invalid task_type "${item.task_type}"` };
    }
    row = normalizeInternal(item);
  } else if (fmt === 'task2') {
    const et = opts.exam_type || 'Academic';
    if (!['Academic', 'General'].includes(et)) {
      return { row: null, error: 'provide valid exam_type for Task 2 import' };
    }
    row = normalizeTask2(item, et);
  } else if (fmt === 'letter') {
    row = normalizeLetter(item);
  } else if (fmt === 'report') {
    row = normalizeReport(item);
  } else {
    return { row: null, error: 'unrecognised format' };
  }

  if (opts.seenTitles) {
    row.title = dedupeTitle(row.title, opts.seenTitles);
  }

  return { row, error: null };
}

const SUMMARY_COMBOS = [
  { key: 'Academic|Task 1', exam_type: 'Academic', task_type: 'Task 1', label: 'Academic · Task 1' },
  { key: 'Academic|Task 2', exam_type: 'Academic', task_type: 'Task 2', label: 'Academic · Task 2' },
  { key: 'General|Task 1', exam_type: 'General', task_type: 'Task 1', label: 'General · Task 1' },
  { key: 'General|Task 2', exam_type: 'General', task_type: 'Task 2', label: 'General · Task 2' },
];

module.exports = {
  detectBankFormat,
  inferExamTaskType,
  normalizeTask2,
  normalizeLetter,
  normalizeReport,
  normalizeInternal,
  normalizeCreatePayload,
  normalizeBankItem,
  dedupeTitle,
  buildTitle,
  truncateTitle,
  extractSvg,
  SUMMARY_COMBOS,
  timeLimitFor,
};
