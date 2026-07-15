import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  loadGradeDraft,
  saveGradeDraft,
  clearGradeDraft,
  essayDataFromDraft,
  EMPTY_ESSAY,
  serializeDraft,
} from '../utils/gradeDraft';

const GradeContext = createContext();

function initialFromStorage() {
  const draft = loadGradeDraft();
  if (!draft) {
    return {
      essayData: { ...EMPTY_ESSAY },
      intent: null,
      pendingSubmit: false,
      pendingUploadGrade: false,
      mockPrompt: '',
      mockTimeLeft: null,
      mockExamTaskId: null,
    };
  }
  return {
    essayData: essayDataFromDraft(draft),
    intent: draft.intent || null,
    pendingSubmit: !!draft.pendingSubmit,
    pendingUploadGrade: !!draft.pendingUploadGrade,
    mockPrompt: draft.mockPrompt || '',
    mockTimeLeft: draft.mockTimeLeft ?? null,
    mockExamTaskId: draft.mockExamTaskId ?? null,
  };
}

export const GradeProvider = ({ children }) => {
  const boot = initialFromStorage();
  const [essayData, setEssayData] = useState(boot.essayData);
  const [gradingStatus, setGradingStatus] = useState('idle');
  const [submissionId, setSubmissionId] = useState(null);
  const [intent, setIntentState] = useState(boot.intent);
  const [pendingSubmit, setPendingSubmitState] = useState(boot.pendingSubmit);
  const [pendingUploadGrade, setPendingUploadGradeState] = useState(boot.pendingUploadGrade);
  const [mockMeta, setMockMeta] = useState({
    mockPrompt: boot.mockPrompt,
    mockTimeLeft: boot.mockTimeLeft,
    mockExamTaskId: boot.mockExamTaskId,
  });

  const persist = useCallback((overrides = {}) => {
    saveGradeDraft(
      serializeDraft({
        essayData: overrides.essayData ?? essayData,
        intent: overrides.intent !== undefined ? overrides.intent : intent,
        pendingSubmit: overrides.pendingSubmit !== undefined ? overrides.pendingSubmit : pendingSubmit,
        pendingUploadGrade:
          overrides.pendingUploadGrade !== undefined ? overrides.pendingUploadGrade : pendingUploadGrade,
        mockPrompt: overrides.mockPrompt !== undefined ? overrides.mockPrompt : mockMeta.mockPrompt,
        mockTimeLeft: overrides.mockTimeLeft !== undefined ? overrides.mockTimeLeft : mockMeta.mockTimeLeft,
        mockExamTaskId:
          overrides.mockExamTaskId !== undefined ? overrides.mockExamTaskId : mockMeta.mockExamTaskId,
        draftUserId: overrides.draftUserId,
      }),
    );
  }, [essayData, intent, pendingSubmit, pendingUploadGrade, mockMeta]);

  const updateEssayData = useCallback((data) => {
    setEssayData((prev) => {
      const next = { ...prev, ...data };
      saveGradeDraft(
        serializeDraft({
          essayData: next,
          intent,
          pendingSubmit,
          pendingUploadGrade,
          mockPrompt: mockMeta.mockPrompt,
          mockTimeLeft: mockMeta.mockTimeLeft,
          mockExamTaskId: mockMeta.mockExamTaskId,
        }),
      );
      return next;
    });
  }, [intent, pendingSubmit, pendingUploadGrade, mockMeta]);

  const setIntent = useCallback((value) => {
    setIntentState(value);
    persist({ intent: value });
  }, [persist]);

  const setPendingSubmit = useCallback((value) => {
    setPendingSubmitState(!!value);
    persist({ pendingSubmit: !!value });
  }, [persist]);

  const setPendingUploadGrade = useCallback((value) => {
    setPendingUploadGradeState(!!value);
    persist({ pendingUploadGrade: !!value });
  }, [persist]);

  const updateMockMeta = useCallback((partial) => {
    setMockMeta((prev) => {
      const next = { ...prev, ...partial };
      saveGradeDraft(
        serializeDraft({
          essayData,
          intent,
          pendingSubmit,
          pendingUploadGrade,
          mockPrompt: next.mockPrompt,
          mockTimeLeft: next.mockTimeLeft,
          mockExamTaskId: next.mockExamTaskId,
        }),
      );
      return next;
    });
  }, [essayData, intent, pendingSubmit, pendingUploadGrade]);

  const clearDraft = useCallback(() => {
    clearGradeDraft();
    setEssayData({ ...EMPTY_ESSAY });
    setIntentState(null);
    setPendingSubmitState(false);
    setPendingUploadGradeState(false);
    setMockMeta({ mockPrompt: '', mockTimeLeft: null, mockExamTaskId: null });
    setGradingStatus('idle');
    setSubmissionId(null);
  }, []);

  const startGrading = () => {
    setGradingStatus('processing');
  };

  // Clear in-memory draft when logout fires
  useEffect(() => {
    const onClear = () => {
      setEssayData({ ...EMPTY_ESSAY });
      setIntentState(null);
      setPendingSubmitState(false);
      setPendingUploadGradeState(false);
      setMockMeta({ mockPrompt: '', mockTimeLeft: null, mockExamTaskId: null });
      setGradingStatus('idle');
      setSubmissionId(null);
    };
    window.addEventListener('ielts-grade-draft-cleared', onClear);
    return () => window.removeEventListener('ielts-grade-draft-cleared', onClear);
  }, []);

  return (
    <GradeContext.Provider
      value={{
        essayData,
        updateEssayData,
        gradingStatus,
        setGradingStatus,
        startGrading,
        submissionId,
        setSubmissionId,
        intent,
        setIntent,
        pendingSubmit,
        setPendingSubmit,
        pendingUploadGrade,
        setPendingUploadGrade,
        mockMeta,
        updateMockMeta,
        clearDraft,
        persistDraft: persist,
      }}
    >
      {children}
    </GradeContext.Provider>
  );
};

export const useGrade = () => useContext(GradeContext);

/** Call from AuthContext logout / login without requiring GradeProvider order issues */
export { clearGradeDraft };
