import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MockExam from '../components/MockExam';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-10 h-10 border-4 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
  </div>
);

const MockExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { essayData } = useGrade();
  const { user, updateUser, isLoading, isAuthenticated } = useAuth();
  const [creditCheckDone, setCreditCheckDone] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const routeState = location.state || {};
  const examType = routeState.examType || essayData.examType || 'Academic';
  const taskType = routeState.taskType || essayData.taskType || 'Task 2';

  useEffect(() => {
    // Wait for auth bootstrap before deciding guest vs authed
    if (isLoading) return;

    let cancelled = false;

    const run = async () => {
      // True guest: allow write without credit check
      if (!isAuthenticated || !user) {
        if (!cancelled) {
          setAllowed(true);
          setCreditCheckDone(true);
        }
        return;
      }

      try {
        const fresh = await api.getMe();
        if (cancelled) return;
        updateUser({
          credits_remaining: fresh.credits_remaining,
          credits_allowance: fresh.credits_allowance,
          subscription_plan: fresh.subscription_plan,
          subscription_status: fresh.subscription_status,
          is_subscribed: fresh.is_subscribed,
          cancel_at_period_end: fresh.cancel_at_period_end,
        });
        const remaining = Number(fresh.credits_remaining) || 0;
        if (remaining <= 0) {
          navigate('/analysis-ready', { state: { outOfCredits: true }, replace: true });
          return;
        }
        setAllowed(true);
      } catch {
        if (cancelled) return;
        navigate('/analysis-ready', { state: { outOfCredits: true }, replace: true });
      } finally {
        if (!cancelled) setCreditCheckDone(true);
      }
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, user?.id]);

  const handleExit = async (action, data) => {
    if (action === 'report' && data?.submissionId) {
      try {
        try {
          const fresh = await api.getMe();
          updateUser({
            credits_remaining: fresh.credits_remaining,
            credits_allowance: fresh.credits_allowance,
          });
        } catch {}

        const report = await api.getReport(data.submissionId);
        navigate('/report', { state: { reportData: report } });
      } catch {
        navigate('/performance');
      }
    } else if (!user) {
      navigate('/');
    } else {
      navigate('/dashboard');
    }
  };

  if (isLoading || !creditCheckDone || !allowed) {
    return <FullPageLoader />;
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
