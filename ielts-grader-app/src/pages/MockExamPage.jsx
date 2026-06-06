import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MockExam from '../components/MockExam';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MockExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { essayData } = useGrade();
  const { updateUser } = useAuth();

  // Exam config comes from router state (dashboard) or GradeContext (landing page)
  const routeState = location.state || {};
  const examType = routeState.examType || essayData.examType || 'Academic';
  const taskType = routeState.taskType || essayData.taskType || 'Task 2';

  const handleExit = async (action, data) => {
    if (action === 'report' && data?.submissionId) {
      try {
        // Refresh credits so header and settings stay accurate
        try {
          const fresh = await api.getMe();
          updateUser({ credits_remaining: fresh.credits_remaining });
        } catch {}

        const report = await api.getReport(data.submissionId);
        navigate('/report', { state: { reportData: report } });
      } catch {
        navigate('/reports');
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <MockExam
      examType={examType}
      taskType={taskType}
      onExit={handleExit}
    />
  );
};

export default MockExamPage;
