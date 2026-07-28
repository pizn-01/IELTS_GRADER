import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Lenis from 'lenis';
import Layout from '../components/Layout';
import SkillGrowth from '../components/SkillGrowth';
import RecentReports from '../components/RecentReports';
import PracticeModal from '../components/PracticeModal';
import { NotificationBanner } from '../components/Modals';
import DashboardKpiStrip from './DashboardKpiStrip';
import PerformanceOverviewDashboard, { ErrorsImpactPanel, OverviewInsightPanels } from '../components/PerformanceOverviewDashboard';
import PerformanceFixCards from '../components/PerformanceFixCards';
import FourteenDaySprint from '../components/FourteenDaySprint';
import StrategyRoadmap from '../components/StrategyRoadmap';
import TargetBandPrompt from '../components/TargetBandPrompt';
import { motion } from 'framer-motion';
import { Play, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGET_BAND } from '../constants/ieltsBands';
import { dashboardGoalSubtitle } from '../utils/goalProgress';
import LearningEditionModal from '../components/LearningEditionModal';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';
import { usePerformanceAnalytics } from '../hooks/usePerformanceAnalytics';
import { trackEvent } from '../utils/trackEvent';

const PERFORMANCE_TABS = ['Overview', 'Fix Cards', 'Strategy', '14-Day sprint'];

function normalizeTab(raw) {
  if (!raw) return 'Overview';
  const decoded = decodeURIComponent(raw).trim();
  const match = PERFORMANCE_TABS.find((t) => t.toLowerCase() === decoded.toLowerCase());
  if (match) return match;
  const aliases = {
    'fix-cards': 'Fix Cards',
    fixcards: 'Fix Cards',
    strategy: 'Strategy',
    sprint: '14-Day sprint',
    '14-day-sprint': '14-Day sprint',
    overview: 'Overview',
  };
  return aliases[decoded.toLowerCase()] || 'Overview';
}

function DashboardApp() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [profileImage, setProfileImage] = useState(user?.profile_image_url || null);
  const [showTargetPrompt, setShowTargetPrompt] = useState(false);

  const [analyticsSeries, setAnalyticsSeries] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeTab = normalizeTab(searchParams.get('tab'));

  const setActiveTab = useCallback((tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'Overview') next.delete('tab');
      else next.set('tab', tab);
      next.delete('task');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const {
    learningStatus,
    modalEdition,
    refreshLearningStatus,
    dismissModal,
    goToLearning,
    showModal: showLearningModal,
  } = useLearningEditionPromo();

  const perf = usePerformanceAnalytics('');

  const fetchDashboardData = async () => {
    try {
      const [metrics, submissionsRes] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getSubmissions({ limit: 10 }),
      ]);

      setAnalyticsSeries(metrics);

      const formatted = (submissionsRes.data || [])
        .filter((s) => s.status === 'graded')
        .slice(0, 10)
        .map((s) => ({
          id: s.id,
          type: s.exam_type,
          task: s.task_type,
          date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          score: s.overall_band != null ? parseFloat(s.overall_band) : null,
        }));
      setRecentSubmissions(formatted);

      const hasGraded = formatted.length > 0 || (metrics?.chartData?.length || 0) > 0;
      setHasData(hasGraded);
      setIsLoading(false);
      refreshLearningStatus().catch(() => {});
    } catch (err) {
      console.warn('Dashboard data fetch failed:', err);
      setRecentSubmissions([]);
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
      navigate('/dashboard');
    }
  };

  const handleNavigate = (target, label) => {
    if (target === 'learning') { navigate('/learning'); }
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
    const scores = analyticsSeries?.chartData?.map((d) => d.overall).filter((v) => v != null) ?? [];
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

  const bandForPrompt = latestBand ?? perf.latestBand;

  // Target band prompt after first grade (same behavior as former Performance page)
  useEffect(() => {
    if (isLoading || perf.loading) return;
    if (!user || user.target_band_confirmed === true) return;
    if (bandForPrompt == null) return;
    setShowTargetPrompt(true);
  }, [isLoading, perf.loading, user, bandForPrompt]);

  const redirectOutOfCredits = () => {
    navigate('/analysis-ready', { state: { outOfCredits: true } });
  };

  const handleStartPractice = async () => {
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
        trackEvent('upgrade_cta_clicked', { source: 'dashboard_upgrade_to_practice' });
        redirectOutOfCredits();
        return;
      }
      setShowModal(true);
    } catch (err) {
      console.warn('Credit check failed:', err?.message);
      redirectOutOfCredits();
    } finally {
      setPracticeStarting(false);
    }
  };

  const learningFootnote =
    learningStatus?.progressToNextEdition?.completed >= 3
      ? `${learningStatus.progressToNextEdition.completed}/5 exams toward your next study guide`
      : null;

  return (
    <Layout currentView="dashboard" onNavigate={handleNavigate} profileImage={profileImage}>
      <div className="w-full max-w-[1440px] mx-auto">
        {/* Atmospheric header band */}
        <div className="relative overflow-hidden border-b border-[#E5E7EB]/60">
          <div className="absolute inset-0 pointer-events-none dashboard-header-wash" />
          <div className="absolute inset-0 pointer-events-none hero-atmosphere opacity-80" />
          <div className="relative z-10 px-4 md:px-6 pt-4 md:pt-5 pb-0">
            <NotificationBanner isOpen={showBanner} onClose={() => setShowBanner(false)} credits={creditsRemaining} />

            {!user?.target_band_confirmed && bandForPrompt != null && (
              <div className="mb-4 bg-[#EFF8FF] border border-[#B2DDFF] rounded-[12px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[13px] text-[#175CD3]">
                  Set your target band to personalize your pathway and progress insights.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTargetPrompt(true)}
                  className="shrink-0 h-[36px] px-4 rounded-[10px] bg-[#175CD3] text-white text-[13px] font-semibold hover:bg-[#1349a8] transition-colors"
                >
                  Set target band
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="min-w-0"
              >
                <p className="text-[11px] font-bold text-[#1A96F3] uppercase tracking-widest mb-1">Dashboard</p>
                <h1 className="text-[22px] md:text-[26px] font-bold text-[#101828] tracking-tight leading-tight mb-1">
                  Welcome back, {candidateFirstName}
                </h1>
                <p className="text-[#667085] font-medium text-[13px] md:text-[14px] max-w-xl leading-relaxed">
                  {dashboardSubtitle}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.06 }}
                className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto shrink-0"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartPractice}
                  disabled={practiceStarting}
                  className="bg-[#2C3E50] text-white w-full sm:w-auto px-5 h-[42px] rounded-[12px] text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Play size={16} fill="currentColor" />
                  {practiceStarting ? 'Checking…' : !hasCredits ? 'Upgrade to Practice' : 'Start New Practice'}
                </motion.button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-4"
            >
              <DashboardKpiStrip
                latestBand={latestBand}
                targetBand={targetBand}
                creditsRemaining={creditsRemaining}
                examsCount={examsCount}
                loading={isLoading}
                learningFootnote={learningFootnote}
              />
            </motion.div>

            {/* Performance tabs — prominent under KPI */}
            <div className="bg-white/90 backdrop-blur-sm rounded-t-[14px] border border-b-0 border-[#E5E7EB] px-2 md:px-3 shadow-[0_-2px_12px_rgba(26,31,54,0.04)]">
              <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar">
                {PERFORMANCE_TABS.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-3.5 md:px-4 py-3.5 whitespace-nowrap shrink-0 transition-colors ${
                        isActive ? 'text-[#101828]' : 'text-[#667085] hover:text-[#101828]'
                      }`}
                    >
                      <span className={`text-[13px] md:text-[14px] ${isActive ? 'font-bold' : 'font-semibold'}`}>
                        {tab}
                      </span>
                      {isActive && (
                        <motion.span
                          layoutId="activeTabUnderlineDashboardPerformance"
                          className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-[#1A96F3]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Branded workspace */}
        <div className="bg-[#F4F6F8] min-h-[40vh]">
          <div className="px-4 md:px-6 py-4 md:py-5">
            {activeTab === 'Overview' ? (
              <div className="bg-[#F4F6F8] rounded-[20px] border border-[#E5E7EB]/80 p-3 md:p-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-7 min-w-0 flex flex-col gap-3">
                    <SkillGrowth
                      hasData={hasData}
                      defaultTask={defaultChartTask}
                      isLoading={isLoading}
                      targetBand={targetBand}
                      onStartPractice={handleStartPractice}
                    />
                    <OverviewInsightPanels
                      loading={perf.loading}
                      trendLabel={perf.trendLabel}
                      trendDetail={perf.trendDetail}
                      topPriorityText={perf.topPriorityText}
                      insightsPanel={{
                        title: 'Strengths & Weaknesses',
                        content: (
                          <div className="space-y-2">
                            <div className="p-2.5 bg-[#F4FCF9] rounded-lg border border-[#E6F8F3] flex items-start gap-2">
                              <TrendingUp className="text-[#30C3A9] shrink-0 mt-0.5" size={14} strokeWidth={2.5} />
                              <p className="text-[11px] leading-snug">
                                <span className="font-bold text-[#30C3A9]">{perf.strongestCrit.name}:</span>{' '}
                                <span className="font-bold text-[#101828]">
                                  {perf.strongestCrit.avg != null ? `currently ${perf.strongestCrit.avg.toFixed(1)}` : 'Complete exams to see data'}
                                </span>
                                {' '}(Keep this stable while you lift your weakest areas).
                              </p>
                            </div>
                            <div className="p-2.5 bg-[#FFF7F7] rounded-lg border border-[#FEEDED] flex items-start gap-2">
                              <TrendingDown className="text-[#EA4335] shrink-0 mt-0.5" size={14} strokeWidth={2.5} />
                              <p className="text-[11px] leading-snug">
                                <span className="font-bold text-[#EA4335]">{perf.bottleneckCrit.name}:</span>{' '}
                                <span className="font-bold text-[#101828]">
                                  {perf.bottleneckCrit.avg != null ? `currently ${perf.bottleneckCrit.avg.toFixed(1)}` : 'Complete exams to see data'}
                                </span>
                                {' '}(This is your primary bottleneck, focus here).
                              </p>
                            </div>
                          </div>
                        ),
                      }}
                    />
                  </div>
                  <div className="lg:col-span-5 min-w-0 flex flex-col gap-3 lg:h-0 lg:min-h-full">
                    <div className="h-auto lg:h-[248px] lg:shrink-0 lg:overflow-hidden flex flex-col">
                      <RecentReports
                        hasData={hasData}
                        dynamicReports={recentSubmissions}
                        onOpenReport={handleOpenRecentReport}
                        onStartPractice={handleStartPractice}
                      />
                    </div>
                    <div className="max-h-[280px] overflow-hidden flex flex-col lg:max-h-none lg:flex-1 lg:min-h-0">
                      <ErrorsImpactPanel
                        frequentErrors={perf.frequentErrors}
                        totalInstances={perf.totalInstances}
                        uniqueTypes={perf.uniqueTypes}
                        loading={perf.loading}
                        onOpenFixCards={() => setActiveTab('Fix Cards')}
                        className="h-full min-h-0"
                      />
                    </div>
                  </div>
                </div>

                <PerformanceOverviewDashboard criterionCards={perf.criterionCards} />
              </div>
            ) : activeTab === 'Fix Cards' ? (
              <PerformanceFixCards
                frequentErrors={perf.frequentErrors}
                bottleneckCrit={perf.bottleneckCrit}
                loading={perf.loading}
              />
            ) : activeTab === 'Strategy' ? (
              <StrategyRoadmap
                strongestCrit={perf.strongestCrit}
                bottleneckCrit={perf.bottleneckCrit}
                frequentErrors={perf.frequentErrors}
                examCount={perf.examCount}
              />
            ) : activeTab === '14-Day sprint' ? (
              <FourteenDaySprint
                loading={perf.loading}
                userId={user?.id}
                frequentErrors={perf.frequentErrors}
                strongestCrit={perf.strongestCrit}
                bottleneckCrit={perf.bottleneckCrit}
                latestBand={perf.latestBand ?? latestBand}
                targetBand={targetBand}
                activeTask=""
                examCount={perf.examCount}
              />
            ) : null}
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

        <TargetBandPrompt
          isOpen={showTargetPrompt}
          onClose={() => setShowTargetPrompt(false)}
          score={bandForPrompt != null ? parseFloat(bandForPrompt).toFixed(1) : null}
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
            perf.refresh();
            await refreshLearningStatus();

            if (reportData) {
              navigate('/report', { state: { reportData } });
            } else if (submissionId) {
              try {
                const report = await api.getReport(submissionId);
                navigate('/report', { state: { reportData: report } });
              } catch {
                navigate('/dashboard');
              }
            } else {
              navigate('/dashboard');
            }
          }}
        />
      </div>
    </Layout>
  );
}

export default DashboardApp;
