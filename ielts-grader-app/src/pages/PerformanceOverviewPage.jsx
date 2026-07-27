import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import PerformanceOverviewDashboard from '../components/PerformanceOverviewDashboard';
import PerformanceFixCards from '../components/PerformanceFixCards';
import FourteenDaySprint from '../components/FourteenDaySprint';
import StrategyRoadmap from '../components/StrategyRoadmap';
import TargetBandPrompt from '../components/TargetBandPrompt';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGET_BAND } from '../constants/ieltsBands';
import { api } from '../services/api';
import LearningEditionModal from '../components/LearningEditionModal';
import { useLearningEditionPromo } from '../hooks/useLearningEditionPromo';

const PerformanceOverviewPage = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showTargetPrompt, setShowTargetPrompt] = useState(false);
  const targetBand = parseFloat(user?.target_band) || DEFAULT_TARGET_BAND;
  const [searchParams] = useSearchParams();
  // Pre-select task from URL query param (?task=Academic+Task+2)
  const VALID_TASKS = ['Academic Task 1', 'Academic Task 2', 'General Task 1', 'General Task 2'];
  const taskFromUrl = searchParams.get('task') || '';
  const initialTask = VALID_TASKS.includes(taskFromUrl) ? taskFromUrl : '';
  // '' = All Tasks (no filter); specific value = filtered by that task type
  const [activeTask, setActiveTask] = useState(initialTask);
  const [activeTab, setActiveTab] = useState("Overview");
  const [chartData, setChartData] = useState([]);
  const [frequentErrors, setFrequentErrors] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    learningStatus,
    modalEdition,
    refreshLearningStatus,
    dismissModal,
    goToLearning,
    showModal: showLearningModal,
  } = useLearningEditionPromo();

  const fetchPerformanceData = useCallback(() => {
    setLoading(true);
    const analyticsArgs = activeTask ? { taskType: activeTask } : undefined;
    const submissionsArgs = activeTask ? { limit: 100, taskType: activeTask } : { limit: 100 };
    Promise.all([
      api.getDashboardAnalytics(analyticsArgs),
      api.getSubmissions(submissionsArgs),
    ]).then(([analytics, subRes]) => {
      setChartData(analytics.chartData || []);
      setFrequentErrors((analytics.frequentErrors || []).slice().sort((a, b) => b.count - a.count));
      setSubmissions((subRes.data || []).filter(s => s.status === 'graded'));
      refreshLearningStatus();
    }).catch(() => {
      setChartData([]);
      setFrequentErrors([]);
      setSubmissions([]);
    }).finally(() => setLoading(false));
  }, [activeTask, refreshLearningStatus]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchPerformanceData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchPerformanceData]);

  // Derived stats from real chart data
  const overallScores = chartData.map(d => d.overall).filter(Boolean);
  const latestBand = overallScores[overallScores.length - 1] ?? null;
  const firstBand  = overallScores[0] ?? null;
  const avgBand    = overallScores.length ? (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(1) : null;
  const bestBand   = overallScores.length ? Math.max(...overallScores).toFixed(1) : null;
  const bandChange = (latestBand && firstBand) ? (latestBand - firstBand).toFixed(1) : null;

  // Auto-open target band prompt after first grade if user hasn't confirmed yet.
  // Performance is a common landing path when report navigation is skipped/fails.
  useEffect(() => {
    if (loading) return;
    if (!user || user.target_band_confirmed === true) return;
    if (latestBand == null) return;
    setShowTargetPrompt(true);
  }, [loading, user, latestBand]);

  // Activity profile — real submission data
  const examCount = submissions.length;
  const studyPeriod = (() => {
    if (submissions.length === 0) return 'No exams yet';
    const dates = submissions.map(s => new Date(s.created_at)).sort((a, b) => a - b);
    if (dates.length === 1) return dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  // Executive summary — computed from real data
  const trendLabel  = bandChange == null ? 'Getting Started' : parseFloat(bandChange) > 0.4 ? 'On the Rise' : parseFloat(bandChange) < -0.4 ? 'Declining' : 'Holding Steady';
  const trendDetail = bandChange == null
    ? 'Complete your first exam to begin tracking progress.'
    : `Overall improvement: ${parseFloat(bandChange) >= 0 ? '+' : ''}${bandChange} from first to latest attempt.`;
  const topErrors   = frequentErrors.slice(0, 3).map(e => e.label);
  const topPriorityText = topErrors.length > 0
    ? `Focus heavily on reducing: ${topErrors.join(', ')}.`
    : 'Complete more exams to identify patterns.';

  // Strengths & weaknesses — highest/lowest avg criterion band
  const avgCriteria = [
    { name: 'Coherence & Cohesion', field: 'coherence' },
    { name: 'Lexical Resource',     field: 'vocabulary' },
    { name: 'Task Response',        field: 'response' },
    { name: 'Grammatical Range',    field: 'grammar' },
  ].map(c => {
    const vals = chartData.map(d => d[c.field]).filter(Boolean);
    return { name: c.name, avg: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  }).filter(c => c.avg != null).sort((a, b) => b.avg - a.avg);
  const strongestCrit  = avgCriteria[0]  ?? { name: 'Coherence & Cohesion', avg: null };
  const bottleneckCrit = avgCriteria[avgCriteria.length - 1] ?? { name: 'Grammatical Range', avg: null };

  // Criterion trend cards
  const criterionCards = [
    { label: "Task Response",   field: "response" },
    { label: "Lexical Resource",field: "vocabulary" },
    { label: "Coherence",       field: "coherence" },
    { label: "Grammatical",     field: "grammar" },
  ].map(c => {
    const vals = chartData.map(d => d[c.field]).filter(v => v != null);
    const first  = vals.length > 0 ? parseFloat(vals[0]).toFixed(1) : null;
    const latest = vals.length > 0 ? parseFloat(vals[vals.length - 1]).toFixed(1) : null;
    const growth = (first && latest) ? (parseFloat(latest) - parseFloat(first)).toFixed(1) : null;
    return { label: c.label, first: first ?? '—', latest: latest ?? '—', growth: growth != null ? (parseFloat(growth) >= 0 ? `+${growth}` : growth) : '—', positive: growth != null ? parseFloat(growth) >= 0 : true };
  });

  // Mistake frequency stats
  const totalInstances = frequentErrors.reduce((s, e) => s + (e.count || 0), 0);
  const uniqueTypes    = frequentErrors.length;

  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const TASK_OPTIONS = ['', 'Academic Task 1', 'Academic Task 2', 'General Task 1', 'General Task 2'];
  const TASK_LABELS  = { '': 'All Tasks', 'Academic Task 1': 'Academic Task 1', 'Academic Task 2': 'Academic Task 2', 'General Task 1': 'General Task 1', 'General Task 2': 'General Task 2' };

  const handleExport = () => { window.print(); };

  // Reset sub-tab when task type changes
  const handleTaskChange = (task) => {
    setActiveTask(task);
    setActiveTab("Overview");
    setTaskDropdownOpen(false);
  };

  const subTabs = [
    "Overview",
    "Fix Cards",
    "Strategy",
    "14-Day sprint",
  ];

  return (
    <div className="w-full">
      <div className="relative overflow-hidden border-b border-[#E5E7EB]/60">
        <div className="absolute inset-0 pointer-events-none dashboard-header-wash" />
        <div className="absolute inset-0 pointer-events-none hero-atmosphere opacity-80" />

        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-5 md:pt-6 relative z-10">
          {!user?.target_band_confirmed && latestBand != null && (
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => onBack ? onBack() : navigate('/dashboard')}
                className="w-[28px] h-[28px] rounded-full border border-[#D0D5DD] bg-white/80 flex items-center justify-center text-[#101828] hover:bg-white transition-all shadow-sm shrink-0"
              >
                <ArrowLeft size={12} strokeWidth={3} />
              </button>
              {/* Task type dropdown */}
              <div className="relative min-w-0">
                <button
                  onClick={() => setTaskDropdownOpen(o => !o)}
                  className="flex items-center gap-2 cursor-pointer group min-w-0"
                >
                  <h1 className="text-[18px] md:text-[22px] font-bold text-[#101828] tracking-tight truncate">
                    {TASK_LABELS[activeTask]}
                  </h1>
                  <ChevronDown size={20} className={`text-[#101828] shrink-0 transition-transform ${taskDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {taskDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-[14px] border border-gray-100 shadow-xl z-50 py-1 min-w-[200px]">
                    {TASK_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleTaskChange(opt)}
                        className={`w-full text-left px-5 py-3 text-[14px] font-medium hover:bg-gray-50 transition-colors ${activeTask === opt ? 'text-[#1A96F3] font-bold' : 'text-[#101828]'}`}
                      >
                        {TASK_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleExport}
              className="w-full md:w-auto px-5 h-[40px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[#1D2939] transition-all shadow-sm"
            >
              Export Report
            </button>
          </div>

          {/* Sub Navigation — matches report tab chrome */}
          <div className="bg-white/70 backdrop-blur-sm rounded-t-[14px] border border-b-0 border-[#E5E7EB] px-2 md:px-3 shadow-[0_-2px_12px_rgba(26,31,54,0.03)]">
            <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto no-scrollbar">
              {subTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-3 md:px-3.5 py-3 whitespace-nowrap shrink-0 transition-colors ${
                      isActive ? 'text-[#101828]' : 'text-[#667085] hover:text-[#101828]'
                    }`}
                  >
                    <span className={`text-[12px] md:text-[13px] ${isActive ? 'font-bold' : 'font-semibold'}`}>
                      {tab}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="activeTabUnderlinePerformance"
                        className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-[#1A96F3]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F4F6F8] min-h-[40vh]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-4 md:py-5">
        {activeTab === "Overview" ?
          <PerformanceOverviewDashboard
            loading={loading}
            latestBand={latestBand}
            firstBand={firstBand}
            avgBand={avgBand}
            bestBand={bestBand}
            change={bandChange}
            changePositive={bandChange == null || parseFloat(bandChange) >= 0}
            examCount={examCount}
            studyPeriod={studyPeriod}
            trendLabel={trendLabel}
            trendDetail={trendDetail}
            topPriorityText={topPriorityText}
            insightsPanel={{
              title: 'Strengths & Weaknesses',
              content: (
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#F4FCF9] rounded-lg border border-[#E6F8F3] flex items-start gap-2">
                    <TrendingUp className="text-[#30C3A9] shrink-0 mt-0.5" size={14} strokeWidth={2.5} />
                    <p className="text-[11px] leading-snug">
                      <span className="font-bold text-[#30C3A9]">{strongestCrit.name}:</span>{' '}
                      <span className="font-bold text-[#101828]">{strongestCrit.avg != null ? `currently ${strongestCrit.avg.toFixed(1)}` : 'Complete exams to see data'}</span>
                      {' '}(Keep this stable while you lift your weakest areas).
                    </p>
                  </div>
                  <div className="p-2.5 bg-[#FFF7F7] rounded-lg border border-[#FEEDED] flex items-start gap-2">
                    <TrendingDown className="text-[#EA4335] shrink-0 mt-0.5" size={14} strokeWidth={2.5} />
                    <p className="text-[11px] leading-snug">
                      <span className="font-bold text-[#EA4335]">{bottleneckCrit.name}:</span>{' '}
                      <span className="font-bold text-[#101828]">{bottleneckCrit.avg != null ? `currently ${bottleneckCrit.avg.toFixed(1)}` : 'Complete exams to see data'}</span>
                      {' '}(This is your primary bottleneck, focus here).
                    </p>
                  </div>
                </div>
              ),
            }}
            chartData={chartData}
            chartYDomain={[0, 9]}
            chartTicks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
            frequentErrors={frequentErrors}
            totalInstances={totalInstances}
            uniqueTypes={uniqueTypes}
            criterionCards={criterionCards}
            targetBand={targetBand}
            onOpenFixCards={() => setActiveTab('Fix Cards')}
          />
        : activeTab === "Fix Cards" ?
          <PerformanceFixCards
            frequentErrors={frequentErrors}
            bottleneckCrit={bottleneckCrit}
            loading={loading}
          />
        : activeTab === "Strategy" ?
          <StrategyRoadmap
            strongestCrit={strongestCrit}
            bottleneckCrit={bottleneckCrit}
            frequentErrors={frequentErrors}
            examCount={examCount}
          />
        : activeTab === "14-Day sprint" ?
          <FourteenDaySprint
            loading={loading}
            userId={user?.id}
            frequentErrors={frequentErrors}
            strongestCrit={strongestCrit}
            bottleneckCrit={bottleneckCrit}
            latestBand={latestBand}
            targetBand={targetBand}
            activeTask={activeTask}
            examCount={examCount}
          />
        : null
        }
      </div>
      </div>

      <LearningEditionModal
        isOpen={showLearningModal && user?.target_band_confirmed === true}
        edition={modalEdition}
        priceCents={learningStatus?.priceCents}
        freeAccess={learningStatus?.freeAccess}
        onDismiss={dismissModal}
        onView={goToLearning}
      />

      <TargetBandPrompt
        isOpen={showTargetPrompt}
        onClose={() => setShowTargetPrompt(false)}
        score={latestBand != null ? parseFloat(latestBand).toFixed(1) : null}
      />
    </div>
  );
};

export default PerformanceOverviewPage;