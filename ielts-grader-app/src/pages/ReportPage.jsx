import React, { useEffect, useState } from 'react';
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
} from '../utils/reportDiscoveryStorage';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const reportData = location.state?.reportData;
  const reportId =
    reportData?.id ||
    reportData?.submission_id ||
    reportData?.attempt_id ||
    'session';
  const needsTargetBand = Boolean(user && user.target_band_confirmed !== true);
  const creditsRemaining = Number(user?.credits_remaining) || 0;
  const [upgradeDismissed, setUpgradeDismissed] = useState(() =>
    hasDismissedReportUpgradeModal(reportId)
  );
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceStarting, setPracticeStarting] = useState(false);

  useEffect(() => {
    setUpgradeDismissed(hasDismissedReportUpgradeModal(reportId));
  }, [reportId]);

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

  if (!reportData) {
    return <Navigate to="/performance" replace />;
  }

  const handleLeaveReport = () => {
    navigate('/performance');
  };

  const redirectOutOfCredits = () => {
    navigate('/analysis-ready', { state: { outOfCredits: true } });
  };

  const handlePracticeAgain = async () => {
    if (practiceStarting) return;
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

  const isSubscribed =
    user?.subscription_status === 'active' || user?.is_subscribed === true;
  const learningIsOpen = showLearningModal && !needsTargetBand;
  // Plan CTA after 2nd free try (1 credit left) and when free credits are gone
  const showUpgradeModal =
    !upgradeDismissed &&
    !isSubscribed &&
    Boolean(user) &&
    creditsRemaining <= 1 &&
    !needsTargetBand &&
    !learningIsOpen &&
    !showPracticeModal;

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
        onPracticeAgain={handlePracticeAgain}
        practiceStarting={practiceStarting}
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
      {/* Upgrade last in queue — never stacks on TargetBand / Learning */}
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
              navigate('/performance');
            }
          } else {
            navigate('/performance');
          }
        }}
      />
    </div>
  );
};

export default ReportPage;
