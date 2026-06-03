import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const GradeContext = createContext();

export const GradeProvider = ({ children }) => {
  const [essayData, setEssayData] = useState({
    examType: '',
    taskType: '',
    promptFile: null,
    essayFile: null,
    essayContent: '',
    questionText: '',
    submissionId: null,
  });
  const [gradingStatus, setGradingStatus] = useState('idle'); // idle | processing | completed | failed

  const updateEssayData = (data) => setEssayData(prev => ({ ...prev, ...data }));

  const startGrading = () => setGradingStatus('processing');
  const completeGrading = () => setGradingStatus('completed');
  const failGrading = () => setGradingStatus('failed');
  const resetGrading = () => {
    setGradingStatus('idle');
    setEssayData({
      examType: '',
      taskType: '',
      promptFile: null,
      essayFile: null,
      essayContent: '',
      questionText: '',
      submissionId: null,
    });
  };

  return (
    <GradeContext.Provider value={{
      essayData,
      updateEssayData,
      gradingStatus,
      setGradingStatus,
      startGrading,
      completeGrading,
      failGrading,
      resetGrading,
    }}>
      {children}
    </GradeContext.Provider>
  );
};

export const useGrade = () => useContext(GradeContext);
