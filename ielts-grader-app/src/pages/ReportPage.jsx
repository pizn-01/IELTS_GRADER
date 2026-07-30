import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import ReportView from '../components/ReportView';
import LearningEditionModal from '../components/LearningEditionModal';
import ReportUpgradeModal from '../components/ReportUpgradeModal';
import PracticeModal from '../components/PracticeModal';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { trackEvent } from '../utils/trackEvent';
import {
  hasDismissedReportUpgradeModal,
  markReportUpgradeModalDismissed,
  markReportTabsGuideSeen,
} from '../utils/reportDiscoveryStorage';
import {
  fetchGradedExamCount,
  needsDashboardBridge,
} from '../utils/dashboardBridge';
import { elevateModelBand } from '../utils/modelAnswerBand';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const initialReport = location.state?.reportData || null;
  const [reportData, setReportData] = useState(initialReport);
  const reportId =
    reportData?.id ||
    reportData?.submission_id ||
    reportData?.attempt_id ||
    initialReport?.id ||
    initialReport?.submission_id ||
    'session';
  const needsTargetBand = Boolean(user && user.target_band_confirmed !== true);
  const creditsRemaining = Number(user?.credits_remaining) || 0;
  const [upgradeDismissed, setUpgradeDismissed] = useState(() =>
    hasDismissedReportUpgradeModal(reportId)
  );
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceStarting, setPracticeStarting] = useState(false);
  const [examsCount, setExamsCount] = useState(null);

  useEffect(() => {
    setUpgradeDismissed(hasDismissedReportUpgradeModal(reportId));
  }, [reportId]);

  useEffect(() => {
    if (!user?.id) {
      setExamsCount(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const count = await fetchGradedExamCount();
      if (!cancelled) setExamsCount(count);
    })();
    return () => { cancelled = true; };
  }, [user?.id, reportData?.id, reportData?.submission_id]);

  // Always re-fetch so model-answer band elevation and taskQuestion stay fresh
  // (location.state can be a stale post-grade payload).
  useEffect(() => {
    const submissionId =
      initialReport?.id ||
      initialReport?.submission_id ||
      initialReport?.attempt_id;
    if (!submissionId || String(submissionId).startsWith('offline-')) {
      if (initialReport) setReportData(initialReport);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await api.getReport(submissionId);
        if (cancelled || !fresh) return;
        if (fresh.model_answer && typeof fresh.model_answer === 'object') {
          fresh.model_answer = {
            ...fresh.model_answer,
            estimated_band: elevateModelBand(
              fresh.model_answer.estimated_band,
              fresh.overall_band,
            ),
          };
        }
        // #region agent log
        fetch('http://127.0.0.1:7565/ingest/ccf50587-967c-4a8a-a2fe-8c502b556896',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'247e96'},body:JSON.stringify({sessionId:'247e96',runId:'post-fix',hypothesisId:'MA1',location:'ReportPage.jsx:refetch',message:'Refetched report with elevated model band',data:{submissionId,overall:fresh.overall_band,modelBand:fresh.model_answer?.estimated_band??null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setReportData(fresh);
        navigate('/report', { replace: true, state: { reportData: fresh } });
      } catch {
        if (!cancelled && initialReport) setReportData(initialReport);
      }
    })();
    return () => { cancelled = true; };
  }, [initialReport?.id, initialReport?.submission_id, initialReport?.attempt_id]);

  const {
    learningStatus,
    modalEdition,
    refreshLearningStatus,
    dismissModal,
    goToLearning,
    showModal: showLearningModal,
  } = useLearningEditionPromo();

  useEffect(() => {
    if (reportData) refreshLearningStatus();
  }, [reportData, refreshLearningStatus]);

  const needsBridge = needsDashboardBridge({
    userId: user?.id,
    examsCount: examsCount ?? 1, // on a report after grade, treat as ≥1 until count loads
  });

  const goToDashboardBridge = useCallback(() => {
    markReportTabsGuideSeen();
    navigate('/dashboard', { state: { fromReportBridge: true } });
  }, [navigate]);

  const isSubscribed =
    user?.subscription_status === 'active' || user?.is_subscribed === true;
  const learningIsOpen = showLearningModal && !needsTargetBand;
  const showUpgradeModal =
    !upgradeDismissed &&
    !isSubscribed &&
    Boolean(user) &&
    creditsRemaining <= 0 &&
    !needsTargetBand &&
    !learningIsOpen &&
    !showPracticeModal;

  const tabGuideAllowed =
    Boolean(user) &&
    !needsTargetBand &&
    !learningIsOpen &&
    !showUpgradeModal &&
    !showPracticeModal;

  const practiceAgainLabel =
    needsBridge && !needsTargetBand ? 'Continue to Dashboard' : 'Practice again';

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7565/ingest/ccf50587-967c-4a8a-a2fe-8c502b556896',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'551c9c'},body:JSON.stringify({sessionId:'551c9c',runId:'pre-fix',hypothesisId:'H5',location:'ReportPage.jsx:tabGuideAllowed',message:'Report page popup/guide gates',data:{tabGuideAllowed,needsTargetBand,learningIsOpen,showUpgradeModal,showPracticeModal,hasTaskQuestion:Boolean(reportData?.taskQuestion||reportData?.question_text),exam_task_id:reportData?.exam_task_id||null,taskQuestionPreview:String(reportData?.taskQuestion||reportData?.question_text||'').slice(0,80)},timestamp:Date.now()})}).catch(()=>{});
  }, [tabGuideAllowed, needsTargetBand, learningIsOpen, showUpgradeModal, showPracticeModal, reportData]);
  // #endregion

  if (!reportData) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLeaveReport = () => {
    if (needsBridge) {
      goToDashboardBridge();
      return;
    }
    navigate('/dashboard');
  };

  const redirectOutOfCredits = () => {
    navigate('/analysis-ready', { state: { outOfCredits: true } });
  };

  const handlePracticeAgain = async () => {
    if (practiceStarting) return;

    // Hard gate: force dashboard visit between free exam 1 and 2.
    if (needsBridge && !needsTargetBand) {
      goToDashboardBridge();
      return;
    }
    if (needsBridge && needsTargetBand) {
      // Target band modal is still up; do not open practice underneath it.
      return;
    }

    setPracticeStarting(true);
    try {
      const fresh = await api.getMe();
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
        trackEvent('upgrade_cta_clicked', { source: 'report_practice_again' });
        redirectOutOfCredits();
        return;
      }
      setShowPracticeModal(true);
    } catch (err) {
      console.warn('Credit check failed:', err?.message);
      redirectOutOfCredits();
    } finally {
      setPracticeStarting(false);
    }
  };

  const dismissUpgradeModal = () => {
    markReportUpgradeModalDismissed(reportId);
    setUpgradeDismissed(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <ReportView
        data={reportData}
        showHeader={false}
        onBack={handleLeaveReport}
        showUpgradeCta={!isSubscribed}
        showTabDiscovery
        tabGuideAllowed={tabGuideAllowed}
        onPracticeAgain={handlePracticeAgain}
        practiceStarting={practiceStarting}
        practiceAgainLabel={practiceAgainLabel}
        bridgePracticeLabel={needsBridge && !needsTargetBand}
      />
      {/* Defer learning promo until target band is set so it doesn't cover the prompt */}
      <LearningEditionModal
        isOpen={learningIsOpen}
        edition={modalEdition}
        priceCents={learningStatus?.priceCents}
        freeAccess={learningStatus?.freeAccess}
        onDismiss={dismissModal}
        onView={goToLearning}
      />
      {/* Upgrade after TargetBand / Learning */}
      <ReportUpgradeModal
        isOpen={showUpgradeModal}
        creditsRemaining={user?.credits_remaining}
        onDismiss={dismissUpgradeModal}
        onPracticeAgain={handlePracticeAgain}
      />
      <PracticeModal
        isOpen={showPracticeModal}
        onClose={() => setShowPracticeModal(false)}
        onStartGrade={() => {
          setShowPracticeModal(false);
          navigate('/grade-my-essay');
        }}
        onStartMock={async (type, task) => {
          try {
            const fresh = await api.getMe();
            updateUser({
              credits_remaining: fresh.credits_remaining,
              credits_allowance: fresh.credits_allowance,
            });
            if ((Number(fresh.credits_remaining) || 0) <= 0) {
              setShowPracticeModal(false);
              navigate('/analysis-ready', { state: { outOfCredits: true } });
              return;
            }
          } catch {
            setShowPracticeModal(false);
            navigate('/analysis-ready', { state: { outOfCredits: true } });
            return;
          }
          setShowPracticeModal(false);
          navigate('/mock-exam', { state: { examType: type, taskType: task } });
        }}
        onAnalysisComplete={async (submissionId, nextReportData) => {
          setShowPracticeModal(false);

          try {
            const fresh = await api.getMe();
            updateUser({
              credits_remaining: fresh.credits_remaining,
              target_band: fresh.target_band,
              target_band_confirmed: fresh.target_band_confirmed,
            });
          } catch {} // non-critical

          await refreshLearningStatus();

          if (nextReportData) {
            navigate('/report', { state: { reportData: nextReportData } });
          } else if (submissionId) {
            try {
              const report = await api.getReport(submissionId);
              navigate('/report', { state: { reportData: report } });
            } catch {
              navigate('/dashboard');
            }
          } else {
            navigate('/dashboard');
          }
        }}
      />
    </div>
  );
};

export default ReportPage;
