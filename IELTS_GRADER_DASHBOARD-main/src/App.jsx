import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import Layout from './components/Layout';
import SkillGrowth from './components/SkillGrowth';
import RecentReports from './components/RecentReports';
import PracticeModal from './components/PracticeModal';
import { NotificationBanner } from './components/Modals';

import ReportView from './components/ReportView';
import MockExam from './components/MockExam';
import ReportsOverview from './components/ReportsOverview';
import Settings from './components/Settings';
import { motion } from 'framer-motion';
import { api } from './services/api';

function App() {
  const [hasData, setHasData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'report', 'mock-exam', or 'settings'
  const [examConfig, setExamConfig] = useState({ type: '', task: '' });
  const [reportData, setReportData] = useState(null);
  const [reportShowHeader, setReportShowHeader] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // Dynamic Backend Integrated Workspace Parameters
  const [currentUser, setCurrentUser] = useState(null);
  const [analyticsSeries, setAnalyticsSeries] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  useEffect(() => {
    const initializeBackendContext = async () => {
      try {
        setIsLoadingContext(true);
        const userPayload = await api.getMe();
        setCurrentUser(userPayload);
        if (userPayload?.profile_image_url) {
          setProfileImage(userPayload.profile_image_url);
        }

        const metrics = await api.getDashboardAnalytics();
        setAnalyticsSeries(metrics);
      } catch (err) {
        console.warn('Backend sync warning: running in decoupled demonstrative mode.', err);
      } finally {
        setIsLoadingContext(false);
      }
    };
    initializeBackendContext();
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleNavigate = (target) => {
    if (target === 'reports') {
      setReportShowHeader(false);
      setView('report');
    } else if (target === 'dashboard') {
      setView('dashboard');
    } else if (target === 'settings') {
      setView('settings');
    }
  };

  if (view === 'report') {
    if (reportShowHeader) {
      return <ReportView data={reportData} showHeader={true} onBack={() => setView('dashboard')} />;
    }
    return (
      <Layout 
        currentView="reports" 
        onNavigate={handleNavigate}
        profileImage={profileImage}
      >
        <ReportsOverview onBack={() => setView('dashboard')} />
      </Layout>
    );
  }

  if (view === 'settings') {
    return (
      <Layout currentView="settings" onNavigate={handleNavigate} profileImage={profileImage}>
        <Settings profileImage={profileImage} setProfileImage={setProfileImage} />
      </Layout>
    );
  }

  if (view === 'mock-exam') {
    return (
      <MockExam 
        examType={examConfig.type} 
        taskType={examConfig.task} 
        onExit={async (targetView, data) => {
          if (data) {
            // Trigger downstream API event submission caching
            try {
              const attemptResponse = await api.submitAttempt({
                exam_type: examConfig.type || 'Academic',
                task_type: examConfig.task || 'Task 2',
                essay_content: data.essay || '',
                time_spent_seconds: 2400
              });
              // Append dynamic parameter report parsing payload
              const finalReport = await api.getReport(attemptResponse.submission_id);
              setReportData({ ...data, ...finalReport });
            } catch (err) {
              console.warn('Backend proxy submission offline handling active.', err);
              setReportData(data);
            }
          }
          if (targetView === 'report') setReportShowHeader(true);
          setView(targetView || 'dashboard');
        }} 
      />
    );
  }

  const candidateFirstName = currentUser?.full_name?.split(' ')[0] || 'John';
  const targetBand = currentUser?.target_band || '7.5';

  return (
    <Layout currentView={view === 'dashboard' ? 'dashboard' : view} onNavigate={handleNavigate} profileImage={profileImage}>
      <div className="w-full max-w-[1340px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <NotificationBanner isOpen={showBanner} onClose={() => setShowBanner(false)} />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {candidateFirstName}</h1>
            <p className="text-gray-500 font-medium tracking-tight text-sm md:text-base">
              You're on track for band {targetBand} - keep going!
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
          >
            <button 
              onClick={() => setHasData(!hasData)} 
              className="text-xs font-bold text-gray-400 hover:text-primary transition-colors order-2 sm:order-1"
            >
              Toggle {hasData ? 'Empty' : 'Full'} State
            </button>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="bg-[#2C3E50] text-white w-full sm:w-[201px] h-[50px] rounded-[16px] text-[16px] flex items-center justify-center hover:bg-opacity-90 transition-all shadow-sm order-1 sm:order-2"
            >
              Start New Practice
            </motion.button>
          </motion.div>
        </div>

        {/* Downstream Data Binding for Decoupled Components */}
        <SkillGrowth hasData={hasData} rawSeriesData={analyticsSeries?.chartData} />
        
        <RecentReports hasData={hasData} dynamicReports={analyticsSeries?.dynamicReports} />

        <PracticeModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onStartMock={(type, task) => {
            setExamConfig({ type, task });
            setShowModal(false);
            setView('mock-exam');
          }}
          onAnalysisComplete={() => {
            setReportShowHeader(true);
            setShowModal(false);
            setView('report');
          }}
        />
      </div>
    </Layout>
  );
}

export default App;
