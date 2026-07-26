import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import ReportView from '../components/ReportView';
import LearningEditionModal from '../components/LearningEditionModal';
import ReportUpgradeModal from '../components/ReportUpgradeModal';
import { VerifyEmailModal } from '../components/Modals';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  markVerificationEmailSent,
  wasVerificationEmailSent,
} from '../utils/authStorage';
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
  const needsEmailVerify = Boolean(
    user &&
    !user.email_verified &&
    (location.state?.requireEmailVerify || (Number(user.credits_remaining) || 0) <= 0)
  );
  const [showVerifyModal, setShowVerifyModal] = useState(false);
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

  // After first free evaluation: ensure verification email is sent, then prompt
  useEffect(() => {
    if (!needsEmailVerify || !user?.email) return;

    let cancelled = false;
    const run = async () => {
      if (!wasVerificationEmailSent()) {
        try {
          const result = await api.sendVerification();
          if (!result?.already_verified) markVerificationEmailSent();
        } catch (err) {
          console.warn('[verify] report-page send failed:', err.message);
          try {
            await api.resendVerification(user.email);
            // Public resend always returns 200; mark so we don't hammer Resend.
            // User can still manually resend from the verify page.
            markVerificationEmailSent();
          } catch {
            /* leave unmarked so another navigation can retry */
          }
        }
      }
      if (!cancelled) setShowVerifyModal(true);
    };
    run();
    return () => { cancelled = true; };
  }, [needsEmailVerify, user?.email]);

  if (!reportData) {
    return <Navigate to="/performance" replace />;
  }

  const handleLeaveReport = () => {
    if (needsEmailVerify) {
      navigate('/verify-email');
      return;
    }
    navigate('/performance');
  };

  const isSubscribed =
    user?.subscription_status === 'active' || user?.is_subscribed === true;
  const learningIsOpen =
    showLearningModal && !needsTargetBand && !showVerifyModal;
  const showUpgradeModal =
    !upgradeDismissed &&
    !isSubscribed &&
    Boolean(user) &&
    !needsTargetBand &&
    !showVerifyModal &&
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
      <VerifyEmailModal
        isOpen={showVerifyModal}
        email={user?.email}
        onContinueReading={() => setShowVerifyModal(false)}
        onGoVerify={() => navigate('/verify-email')}
        onResend={async () => {
          if (!user?.email) return;
          try {
            await api.sendVerification();
          } catch {
            await api.resendVerification(user.email);
          }
          markVerificationEmailSent();
        }}
      />
      {/* Upgrade last in queue — never stacks on TargetBand / Verify / Learning */}
      <ReportUpgradeModal
        isOpen={showUpgradeModal}
        creditsRemaining={user?.credits_remaining}
        onDismiss={dismissUpgradeModal}
      />
    </div>
  );
};

export default ReportPage;
