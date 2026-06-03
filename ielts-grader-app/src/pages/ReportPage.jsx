import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReportView from '../components/ReportView';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reportData = location.state?.reportData;

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
