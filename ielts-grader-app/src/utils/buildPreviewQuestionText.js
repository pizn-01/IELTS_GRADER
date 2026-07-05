const REPORT_FOOTER = [
  'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  '',
  'Write at least 150 words.',
].join('\n');

const TASK2_FOOTER = 'Write at least 250 words.';

/**
 * Build question_text as stored in exam_tasks — mirrors taskBankFormat for admin live preview.
 */
export function buildPreviewQuestionText(form) {
  if (!form) return '';

  const { exam_type, task_type, prompt, question_text, bullet_points } = form;

  if (exam_type === 'General' && task_type === 'Task 1') {
    const scenario = (prompt || '').trim();
    const bullets = Array.isArray(bullet_points) ? bullet_points.filter(Boolean) : [];
    const numbered = bullets.map((b, i) => `${i + 1}. ${String(b).trim()}`).join('\n');
    const parts = [scenario];
    if (numbered) parts.push('', 'In your letter:', numbered);
    return parts.join('\n').trim();
  }

  if (exam_type === 'Academic' && task_type === 'Task 1') {
    const body = (prompt || '').trim();
    if (!body) return REPORT_FOOTER;
    if (body.toLowerCase().includes('summarise the information')) return body;
    return `${body}\n\n${REPORT_FOOTER}`;
  }

  const q = (question_text || prompt || '').trim();
  if (!q) return TASK2_FOOTER;
  if (q.toLowerCase().includes('write at least 250')) return q;
  return `${q}\n\n${TASK2_FOOTER}`;
}
