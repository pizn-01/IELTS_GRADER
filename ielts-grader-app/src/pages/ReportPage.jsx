import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReportView from '../components/ReportView';
import { api } from '../services/api';

const ReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reportData, setReportData] = useState(location.state?.reportData || null);
  const [isLoading, setIsLoading] = useState(!location.state?.reportData);

  // If navigated directly to /report, fetch the requested report or the user's latest graded report
  useEffect(() => {
    if (location.state?.reportData) return; // Already have data
    setIsLoading(true);
    const fetchPromise = location.state?.reportId
      ? api.getReport(location.state.reportId)
      : api.getLatestReport();

    fetchPromise
      .then(data => setReportData(data))
      .catch(err => {
        console.warn('[ReportPage] Failed to fetch report:', err);
        setReportData(null);
      })
      .finally(() => setIsLoading(false));
  }, [location.state?.reportId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 border-4 border-[#E3F2FD] rounded-full" />
            <div className="absolute inset-0 border-4 border-[#1A96F3] rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">No Report Found</h2>
          <p className="text-sm text-gray-500">You haven't submitted an essay yet. Submit one from the dashboard to see your results here.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full h-[46px] bg-[#2C3E50] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#34495E] transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
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
