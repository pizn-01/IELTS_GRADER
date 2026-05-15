import React, { createContext, useContext, useState } from 'react';

const GradeContext = createContext();

export const GradeProvider = ({ children }) => {
  const [essayData, setEssayData] = useState({
    examType: '',
    taskType: '',
    promptFile: null,
    essayFile: null,
  });
  const [gradingStatus, setGradingStatus] = useState('idle'); // idle, processing, completed
  const [userStatus, setUserStatus] = useState({
    isLoggedIn: false, // Reverting to false to test the actual login flow
    isPremium: false,
    credits: 3,
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@gmail.com',
  });

  const updateEssayData = (data) => setEssayData(prev => ({ ...prev, ...data }));
  
  const startGrading = () => {
    setGradingStatus('processing');
    // Simulation logic will be handled in the component
  };

  return (
    <GradeContext.Provider value={{ 
      essayData, 
      updateEssayData, 
      gradingStatus, 
      setGradingStatus,
      startGrading,
      userStatus,
      setUserStatus
    }}>
      {children}
    </GradeContext.Provider>
  );
};

export const useGrade = () => useContext(GradeContext);
