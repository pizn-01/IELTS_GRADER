import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import ReportView from '../components/ReportView';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reportData = location.state?.reportData;

  if (!reportData) {
    return <Navigate to="/reports" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <ReportView
        data={reportData}
        showHeader={false}
        onBack={() => navigate('/reports')}
      />
    </div>
  );
};

export default ReportPage;
