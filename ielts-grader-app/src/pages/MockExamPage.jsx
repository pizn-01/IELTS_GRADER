import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MockExam from '../components/MockExam';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MockExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { essayData } = useGrade();
  const { user, updateUser } = useAuth();

  // Exam config comes from router state (dashboard) or GradeContext (landing page)
  const routeState = location.state || {};
  const examType = routeState.examType || essayData.examType || 'Academic';
  const taskType = routeState.taskType || essayData.taskType || 'Task 2';
  const hasCredits = (user?.credits_remaining ?? 0) > 0;

  useEffect(() => {
    if (user && !hasCredits) {
      navigate('/analysis-ready', { state: { outOfCredits: true }, replace: true });
    }
  }, [user, hasCredits, navigate]);

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
        navigate('/performance');
      }
    } else {
      navigate('/dashboard');
    }
  };

  if (user && !hasCredits) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MockExam
      examType={examType}
      taskType={taskType}
      onExit={handleExit}
    />
  );
};

export default MockExamPage;
