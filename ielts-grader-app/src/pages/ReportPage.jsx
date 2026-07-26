import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import ReportView from '../components/ReportView';
import LearningEditionModal from '../components/LearningEditionModal';
import ReportUpgradeModal from '../components/ReportUpgradeModal';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';
import { useAuth } from '../context/AuthContext';
import {
  hasDismissedReportUpgradeModal,
  markReportUpgradeModalDismissed,
} from '../utils/reportDiscoveryStorage';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
    !learningIsOpen;

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
      />
    </div>
  );
};

export default ReportPage;
