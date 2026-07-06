import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import ReportView from '../components/ReportView';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reportData = location.state?.reportData;

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
    </div>
  );
};

export default ReportPage;
