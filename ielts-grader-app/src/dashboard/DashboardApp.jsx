import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import Layout from '../components/Layout';
import SkillGrowth from '../components/SkillGrowth';
import RecentReports from '../components/RecentReports';
import PracticeModal from '../components/PracticeModal';
import { NotificationBanner } from '../components/Modals';
import DashboardKpiStrip from './DashboardKpiStrip';
import { motion } from 'framer-motion';
import { BarChart3, Play } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGET_BAND } from '../constants/ieltsBands';
import { dashboardGoalSubtitle } from '../utils/goalProgress';
import LearningEditionModal from '../components/LearningEditionModal';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';
import { trackEvent } from '../utils/trackEvent';

function DashboardApp() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [profileImage, setProfileImage] = useState(user?.profile_image_url || null);

  const [analyticsSeries, setAnalyticsSeries] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    learningStatus,
    modalEdition,
    refreshLearningStatus,
    dismissModal,
    goToLearning,
    showModal: showLearningModal,
  } = useLearningEditionPromo();

  const fetchDashboardData = async () => {
    try {
      const [metrics, submissionsRes, freshUser] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getSubmissions({ limit: 10 }),
        api.getMe().catch(() => null),
      ]);

      if (freshUser) {
        updateUser({
          target_band: freshUser.target_band,
          target_band_confirmed: freshUser.target_band_confirmed,
          credits_remaining: freshUser.credits_remaining,
          credits_allowance: freshUser.credits_allowance,
          subscription_plan: freshUser.subscription_plan,
          subscription_status: freshUser.subscription_status,
          is_subscribed: freshUser.is_subscribed,
          cancel_at_period_end: freshUser.cancel_at_period_end,
          full_name: freshUser.full_name,
        });
      }

      setAnalyticsSeries(metrics);

      const formatted = (submissionsRes.data || [])
        .filter(s => s.status === 'graded')
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          type: s.exam_type,
          task: s.task_type,
          date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          score: s.overall_band != null ? parseFloat(s.overall_band) : null,
        }));
      setRecentSubmissions(formatted);

      const hasGraded = formatted.length > 0 || (metrics?.chartData?.length || 0) > 0;
      setHasData(hasGraded);
      await refreshLearningStatus();
    } catch (err) {
      console.warn('Dashboard data fetch failed:', err);
      setRecentSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const handleOpenRecentReport = async (submissionId) => {
    try {
      const report = await api.getReport(submissionId);
      navigate('/report', { state: { reportData: report } });
    } catch {
      navigate('/performance');
    }
  };

  const handleNavigate = (target, label) => {
    if (target === 'reports') { navigate('/performance'); }
    else if (target === 'learning') { navigate('/learning'); }
    else if (target === 'dashboard') { navigate('/dashboard'); }
    else if (target === 'subscription') { navigate('/subscription'); }
    else if (target === 'settings') { navigate('/settings', { state: { activeTab: label } }); }
    else if (target === 'logout') { logout(); }
  };

  const candidateFirstName = user?.full_name?.split(' ')[0] || 'Candidate';
  const targetBand = parseFloat(user?.target_band) || DEFAULT_TARGET_BAND;
  const creditsRemaining = Number(user?.credits_remaining) || 0;
  const hasCredits = creditsRemaining > 0;
  const [practiceStarting, setPracticeStarting] = useState(false);

  const latestBand = useMemo(() => {
    const scores = analyticsSeries?.chartData?.map(d => d.overall).filter(v => v != null) ?? [];
    return scores.length ? parseFloat(scores[scores.length - 1]) : null;
  }, [analyticsSeries]);

  const examsCount = useMemo(() => {
    if (recentSubmissions === null) return null;
    const fromChart = analyticsSeries?.chartData?.length ?? 0;
    return Math.max(recentSubmissions.length, fromChart);
  }, [recentSubmissions, analyticsSeries]);

  const dashboardSubtitle = useMemo(
    () => dashboardGoalSubtitle({ latestBand, targetBand, creditsRemaining }),
    [latestBand, targetBand, creditsRemaining],
  );

  const defaultChartTask = useMemo(() => {
    const recent = recentSubmissions?.[0];
    if (!recent?.type || !recent?.task) return 'Academic Task 2';
    return `${recent.type} ${recent.task}`;
  }, [recentSubmissions]);

  const redirectOutOfCredits = () => {
    navigate('/analysis-ready', { state: { outOfCredits: true } });
  };

  const handleStartPractice = async () => {
    if (practiceStarting) return;
    setPracticeStarting(true);
    try {
      // Always re-fetch — cached AuthContext credits can be stale after the free exam.
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
        trackEvent('upgrade_cta_clicked', { source: 'dashboard_upgrade_to_practice' });
        redirectOutOfCredits();
        return;
      }
      setShowModal(true);
    } catch (err) {
      // Fail closed: never open practice if we cannot verify credits.
      console.warn('Credit check failed:', err?.message);
      redirectOutOfCredits();
    } finally {
      setPracticeStarting(false);
    }
  };

  return (
    <Layout currentView="dashboard" onNavigate={handleNavigate} profileImage={profileImage}>
      <div className="w-full max-w-[1440px] mx-auto">
        {/* Hero band */}
        <div className="relative overflow-hidden border-b border-[#E5E7EB]/60">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, #E0F2FE 0%, #FCE7F3 40%, #FCE7F3 60%, #CFFAFE 100%)',
              opacity: 0.75,
            }}
          />
          <div className="relative z-10 px-4 md:px-6 pt-6 md:pt-10 pb-6 md:pb-8">
            <NotificationBanner isOpen={showBanner} onClose={() => setShowBanner(false)} credits={creditsRemaining} />

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 md:mb-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-[12px] font-bold text-[#1A96F3] uppercase tracking-widest mb-2">Dashboard</p>
                <h1 className="text-[28px] md:text-[32px] font-bold text-[#101828] tracking-tight mb-2">
                  Welcome back, {candidateFirstName}
                </h1>
                <p className="text-[#667085] font-medium text-sm md:text-[15px] max-w-xl leading-relaxed">
                  {dashboardSubtitle}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/performance')}
                  className="bg-white/90 backdrop-blur-sm text-[#2C3E50] border border-[#D0D5DD] w-full sm:w-auto px-5 h-[48px] rounded-[14px] text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-white transition-all shadow-sm"
                >
                  <BarChart3 size={18} />
                  View Overall Performance
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartPractice}
                  disabled={practiceStarting}
                  className="bg-[#2C3E50] text-white w-full sm:w-auto px-6 h-[48px] rounded-[14px] text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Play size={18} fill="currentColor" />
                  {practiceStarting ? 'Checking…' : !hasCredits ? 'Upgrade to Practice' : 'Start New Practice'}
                </motion.button>
              </motion.div>
            </div>

            <DashboardKpiStrip
              latestBand={latestBand}
              targetBand={targetBand}
              creditsRemaining={creditsRemaining}
              examsCount={examsCount}
              loading={isLoading}
            />
            {learningStatus?.progressToNextEdition?.completed >= 3 && (
              <p className="text-[12px] text-[#667085] mt-3 font-medium">
                {learningStatus.progressToNextEdition.completed}/5 exams toward your next study guide
              </p>
            )}
          </div>
        </div>

        {/* Main canvas */}
        <div className="px-4 md:px-6 py-6 md:py-8">
          <div className="bg-[#F4F6F8] rounded-[24px] border border-[#E5E7EB]/80 p-4 md:p-6 flex flex-col gap-6">
            <SkillGrowth
              hasData={hasData}
              defaultTask={defaultChartTask}
              isLoading={isLoading}
              targetBand={targetBand}
              onStartPractice={handleStartPractice}
            />
            <RecentReports
              hasData={hasData}
              dynamicReports={recentSubmissions}
              onOpenReport={handleOpenRecentReport}
              onStartPractice={handleStartPractice}
            />
          </div>
        </div>

        <LearningEditionModal
          isOpen={showLearningModal}
          edition={modalEdition}
          priceCents={learningStatus?.priceCents}
          freeAccess={learningStatus?.freeAccess}
          onDismiss={dismissModal}
          onView={goToLearning}
        />

        <PracticeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onStartGrade={() => {
            setShowModal(false);
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
                setShowModal(false);
                navigate('/analysis-ready', { state: { outOfCredits: true } });
                return;
              }
            } catch {
              setShowModal(false);
              navigate('/analysis-ready', { state: { outOfCredits: true } });
              return;
            }
            setShowModal(false);
            navigate('/mock-exam', { state: { examType: type, taskType: task } });
          }}
          onAnalysisComplete={async (submissionId, reportData) => {
            setShowModal(false);

            try {
              const fresh = await api.getMe();
              updateUser({
                credits_remaining: fresh.credits_remaining,
                target_band: fresh.target_band,
                target_band_confirmed: fresh.target_band_confirmed,
              });
            } catch {} // non-critical

            fetchDashboardData();
            await refreshLearningStatus();

            if (reportData) {
              navigate('/report', { state: { reportData } });
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
    </Layout>
  );
}

export default DashboardApp;
