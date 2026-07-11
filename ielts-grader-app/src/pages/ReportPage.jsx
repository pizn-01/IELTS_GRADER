import React, { useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import ReportView from '../components/ReportView';
import LearningEditionModal from '../components/LearningEditionModal';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';
import { useAuth } from '../context/AuthContext';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const reportData = location.state?.reportData;
  const needsTargetBand = Boolean(user && user.target_band_confirmed !== true);

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

  return (
    <div className="min-h-screen bg-white">
      <ReportView
        data={reportData}
        showHeader={false}
        onBack={() => navigate('/performance')}
      />
      {/* Defer learning promo until target band is set so it doesn't cover the prompt */}
      <LearningEditionModal
        isOpen={showLearningModal && !needsTargetBand}
        edition={modalEdition}
        priceCents={learningStatus?.priceCents}
        freeAccess={learningStatus?.freeAccess}
        onDismiss={dismissModal}
        onView={goToLearning}
      />
    </div>
  );
};

export default ReportPage;
