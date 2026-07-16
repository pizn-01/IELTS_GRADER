import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import MockExam from '../components/MockExam';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const MockExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { essayData } = useGrade();
  const { user, updateUser, isAuthenticated, isLoading } = useAuth();
  const [creditCheckDone, setCreditCheckDone] = useState(!isAuthenticated);
  const [allowed, setAllowed] = useState(!isAuthenticated);

  // Exam config comes from router state (dashboard) or GradeContext (landing page)
  const routeState = location.state || {};
  const examType = routeState.examType || essayData.examType || 'Academic';
  const taskType = routeState.taskType || essayData.taskType || 'Task 2';

  // Logged-in users who already used their free credit must verify email first
  const needsVerify =
    isAuthenticated &&
    user &&
    !user.email_verified &&
    (Number(user.credits_remaining) || 0) <= 0;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setCreditCheckDone(true);
      setAllowed(true);
      return;
    }

    let cancelled = false;

    const verifyCredits = async () => {
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
          email_verified: fresh.email_verified,
        });
        const remaining = Number(fresh.credits_remaining) || 0;
        if (remaining <= 0) {
          if (!fresh.email_verified) {
            navigate('/verify-email', { replace: true });
            return;
          }
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

    verifyCredits();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  const handleExit = async (action, data) => {
    if (action === 'report' && data?.submissionId) {
      try {
        try {
          const fresh = await api.getMe();
          updateUser({
            credits_remaining: fresh.credits_remaining,
            credits_allowance: fresh.credits_allowance,
            email_verified: fresh.email_verified,
          });
        } catch {}

        const report = await api.getReport(data.submissionId);
        navigate('/report', { state: { reportData: report } });
      } catch {
        navigate('/performance');
      }
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  };

  if (isLoading || (!creditCheckDone && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsVerify) {
    return <Navigate to="/verify-email" replace />;
  }

  if (isAuthenticated && !allowed) {
    return null;
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
