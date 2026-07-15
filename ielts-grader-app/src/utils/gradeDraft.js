const DRAFT_KEY = 'ielts_grade_draft_v1';

const EMPTY_ESSAY = {
  examType: '',
  taskType: '',
  promptFile: null,
  essayFile: null,
  essayContent: '',
  questionContent: '',
  chartImage: null,
  bulletPoints: [],
  letterType: null,
  openingLine: '',
  chartType: null,
  taskVariant: null,
};

/** Serializable draft fields only (no File blobs). */
export function serializeDraft({
  essayData,
  intent = null,
  pendingSubmit = false,
  pendingUploadGrade = false,
  mockPrompt = '',
  mockTimeLeft = null,
  mockExamTaskId = null,
  draftUserId = null,
} = {}) {
  const data = essayData || EMPTY_ESSAY;
  return {
    examType: data.examType || '',
    taskType: data.taskType || '',
    essayContent: data.essayContent || '',
    questionContent: data.questionContent || '',
    chartImage: typeof data.chartImage === 'string' ? data.chartImage : null,
    bulletPoints: Array.isArray(data.bulletPoints) ? data.bulletPoints : [],
    letterType: data.letterType ?? null,
    openingLine: data.openingLine || '',
    chartType: data.chartType ?? null,
    taskVariant: data.taskVariant ?? null,
    intent: intent || null,
    pendingSubmit: !!pendingSubmit,
    pendingUploadGrade: !!pendingUploadGrade,
    mockPrompt: mockPrompt || '',
    mockTimeLeft: mockTimeLeft ?? null,
    mockExamTaskId: mockExamTaskId ?? null,
    draftUserId: draftUserId ?? null,
  };
}

export function loadGradeDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGradeDraft(partial) {
  try {
    const prev = loadGradeDraft() || serializeDraft();
    const next = { ...prev, ...partial };
    // Drop oversized chart images rather than failing the whole draft
    if (typeof next.chartImage === 'string' && next.chartImage.length > 2_000_000) {
      next.chartImage = null;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  } catch {
    try {
      const prev = loadGradeDraft() || serializeDraft();
      const slim = { ...prev, ...partial, chartImage: null };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(slim));
      return slim;
    } catch {
      return null;
    }
  }
}

export function clearGradeDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function essayDataFromDraft(draft) {
  if (!draft) return { ...EMPTY_ESSAY };
  return {
    ...EMPTY_ESSAY,
    examType: draft.examType || '',
    taskType: draft.taskType || '',
    essayContent: draft.essayContent || '',
    questionContent: draft.questionContent || '',
    chartImage: draft.chartImage || null,
    bulletPoints: Array.isArray(draft.bulletPoints) ? draft.bulletPoints : [],
    letterType: draft.letterType ?? null,
    openingLine: draft.openingLine || '',
    chartType: draft.chartType ?? null,
    taskVariant: draft.taskVariant ?? null,
  };
}

export { EMPTY_ESSAY, DRAFT_KEY };
