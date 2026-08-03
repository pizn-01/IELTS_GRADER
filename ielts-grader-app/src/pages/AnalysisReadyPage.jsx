import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGrade } from '../context/GradeContext';
import { api } from '../services/api';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import AIProcessingModal from '../marketing/AIProcessingModal';
import {
  peekPendingGradePayload,
  consumePendingGradePayload,
} from '../utils/authStorage';
import { redirectIfNeedsDashboardBridge } from '../utils/dashboardBridge';
import { goToUpgradeShop } from '../utils/pricingNav';

const AnalysisReadyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();

  const { gradingStatus, setGradingStatus, submissionId, setSubmissionId, essayData, updateEssayData } = useGrade();
  const pollRef = useRef(null);
  const hydratedRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const pollStartedRef = useRef(false);

  // Restore essay payload saved before login/signup (incl. Google OAuth)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const pending = peekPendingGradePayload();
    if (pending?.essayContent) {
      updateEssayData(pending);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set grading status once on mount only (Hero already sets it before navigating;
  // this is a safety net for direct URL access with credits)
  useEffect(() => {
    if (user && user.credits_remaining > 0 && gradingStatus === 'idle') {
      setGradingStatus('processing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGradingComplete = async () => {
    // Modal fires this as soon as it opens — only start one poll/submit loop.
    if (pollStartedRef.current || pollRef.current) return;
    pollStartedRef.current = true;

    let currentSubId = submissionId;

    // submissionId is pre-set by Hero before navigation in the normal flow.
    // Fallback: if somehow not set, submit now (e.g. after login with pending essay).
    if (!currentSubId) {
      if ((user?.credits_remaining ?? 0) <= 0) {
        pollStartedRef.current = false;
        setGradingStatus('completed');
        goToUpgradeShop({ navigate, from: 'out_of_credits', plan: 'monthly', replace: true });
        return;
      }
      if (user?.id && await redirectIfNeedsDashboardBridge({ userId: user.id, navigate })) {
        pollStartedRef.current = false;
        setGradingStatus('idle');
        return;
      }
      if (essayData?.essayContent) {
        if (submitInFlightRef.current) {
          pollStartedRef.current = false;
          return;
        }
        submitInFlightRef.current = true;
        try {
          const res = await api.submitAttempt({
            exam_type: essayData.examType || 'Academic',
            task_type: essayData.taskType || 'Task 2',
            essay_content: essayData.essayContent,
            question_text: essayData.questionContent || '',
            bullet_points: essayData.bulletPoints || [],
            letter_type: essayData.letterType || undefined,
            opening_line: essayData.openingLine || undefined,
            chart_type: essayData.chartType || undefined,
            chart_image:
              essayData.taskVariant === 'task1-report' && essayData.chartImage
                ? essayData.chartImage
                : undefined,
            exam_task_id: essayData.examTaskId || undefined,
            time_spent_seconds: essayData.timeSpentSeconds || 0,
          });
          currentSubId = res.submission_id;
          setSubmissionId(currentSubId);
          consumePendingGradePayload();
        } catch (err) {
          console.error('Failed to submit attempt:', err.message);
          pollStartedRef.current = false;
          setGradingStatus('completed');
          if (err.message && err.message.toLowerCase().includes('credit')) {
            goToUpgradeShop({ navigate, from: 'out_of_credits', plan: 'monthly', replace: true });
          } else {
            navigate('/dashboard');
          }
          return;
        } finally {
          submitInFlightRef.current = false;
        }
      } else {
        pollStartedRef.current = false;
        setGradingStatus('completed');
        navigate('/dashboard');
        return;
      }
    }

    // Keep modal open (gradingStatus stays 'processing') while we poll the backend.
    // The modal will disappear naturally when we navigate away on completion.
    let attempts = 0;
    const maxAttempts = 900; // ~15 min at 1s — retries after OOM/restart can take longer
    let settled = false;

    const tick = async () => {
      if (settled) return;
      attempts++;
      try {
        const { status } = await api.checkStatus(currentSubId);
        if (status === 'graded') {
          settled = true;
          if (pollRef.current) clearInterval(pollRef.current);
          let fresh = null;
          try {
            fresh = await api.getMe();
            updateUser({
              credits_remaining: fresh.credits_remaining,
            });
          } catch {}
          const report = await api.getReport(currentSubId);
          const sessionQ = String(essayData?.questionContent || '').trim();
          const mergedReport = {
            ...report,
            taskQuestion: report?.taskQuestion || report?.question_text || sessionQ || null,
            question_text: report?.question_text || report?.taskQuestion || sessionQ || null,
          };
          // #region agent log
          const body = {
            sessionId: '551c9c',
            runId: 'post-fix',
            hypothesisId: 'H1,H2',
            location: 'AnalysisReadyPage.jsx:getReport',
            message: 'Fetched report payload after grading',
            data: {
              submissionId: currentSubId,
              exam_type: report?.exam_type,
              task_type: report?.task_type,
              hasApiTaskQuestion: Boolean(report?.taskQuestion || report?.question_text),
              hasSessionQuestion: Boolean(sessionQ),
              mergedHasQuestion: Boolean(mergedReport.taskQuestion),
              questionPreview: String(mergedReport.taskQuestion || '').slice(0, 120),
              hasExamTaskId: Boolean(report?.exam_task_id),
              essayPreview: String(report?.essay || '').slice(0, 80),
            },
            timestamp: Date.now(),
          };
          fetch('http://127.0.0.1:7565/ingest/ccf50587-967c-4a8a-a2fe-8c502b556896', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '551c9c' },
            body: JSON.stringify(body),
          }).catch(() => {});
          fetch('/api/debug/agent-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).catch(() => {});
          // #endregion
          setGradingStatus('completed');
          navigate('/report', { state: { reportData: mergedReport } });
        } else if (attempts >= maxAttempts) {
          // Still grading in background — don't treat as hard failure; user can open Reports later
          settled = true;
          if (pollRef.current) clearInterval(pollRef.current);
          setGradingStatus('completed');
          navigate('/dashboard');
        }
      } catch {
        if (attempts >= maxAttempts) {
          settled = true;
          if (pollRef.current) clearInterval(pollRef.current);
          setGradingStatus('completed');
          navigate('/dashboard');
        }
      }
    };

    if (pollRef.current) clearInterval(pollRef.current);
    tick(); // check immediately — don't wait for first interval
    pollRef.current = setInterval(tick, 1000);
  };

  // Cleanup poll on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const forceOutOfCredits = !!location.state?.outOfCredits;

  // Logged-in out-of-credits → single in-app shop (/upgrade), not a second paywall UI.
  useEffect(() => {
    if (!user) return;
    if (forceOutOfCredits || (Number(user.credits_remaining) || 0) <= 0) {
      goToUpgradeShop({
        navigate,
        from: 'out_of_credits',
        plan: 'monthly',
        replace: true,
      });
    }
  }, [user, forceOutOfCredits, navigate]);

  // While redirecting away from OOC, avoid flashing grading chrome.
  if (user && (forceOutOfCredits || (Number(user.credits_remaining) || 0) <= 0)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[14px] text-gray-400">Taking you to plans…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-['Inter',_sans-serif]">
      <Navbar />
      <Footer />

      <AIProcessingModal
        isOpen={gradingStatus === 'processing'}
        onComplete={onGradingComplete}
      />
    </div>
  );
};


export default AnalysisReadyPage;
