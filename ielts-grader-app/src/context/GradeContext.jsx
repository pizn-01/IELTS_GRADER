import React, { createContext, useContext, useState } from 'react';

const GradeContext = createContext();

export const GradeProvider = ({ children }) => {
  const [essayData, setEssayData] = useState({
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
  });
  const [gradingStatus, setGradingStatus] = useState('idle'); // idle, processing, completed
  const [submissionId, setSubmissionId] = useState(null); // set by MockExam after api.submitAttempt succeeds

  const updateEssayData = (data) => setEssayData(prev => ({ ...prev, ...data }));

  const startGrading = () => {
    setGradingStatus('processing');
  };

  return (
    <GradeContext.Provider value={{
      essayData,
      updateEssayData,
      gradingStatus,
      setGradingStatus,
      startGrading,
      submissionId,
      setSubmissionId,
    }}>
      {children}
    </GradeContext.Provider>
  );
};

export const useGrade = () => useContext(GradeContext);
