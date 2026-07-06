import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import PerformanceOverviewDashboard from '../components/PerformanceOverviewDashboard';
import FourteenDaySprint from '../components/FourteenDaySprint';
import StrategyRoadmap from '../components/StrategyRoadmap';
import TargetBandPrompt from '../components/TargetBandPrompt';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGET_BAND } from '../constants/ieltsBands';
import { formatGoalGap, goalStatusText } from '../utils/goalProgress';
import { api } from '../services/api';
import LearningMaterialPromo from '../components/LearningMaterialPromo';

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
    }).catch(() => {
      setChartData([]);
      setFrequentErrors([]);
      setSubmissions([]);
    }).finally(() => setLoading(false));
  }, [activeTask]);

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
    "Detailed Breakdown",
    "Fix Cards",
    "Strategy",
    "14-Day sprint",
  ];

  return (
    <div className="w-full">
      <div className="relative overflow-visible bg-white border-b border-gray-100">
        {/* Gradient background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(90deg, #E0F2FE 0%, #FCE7F3 40%, #FCE7F3 60%, #CFFAFE 100%)',
          opacity: 0.8
        }}></div>

        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-12 relative z-10">
          {!user?.target_band_confirmed && latestBand != null && (
            <div className="mb-6 bg-[#EFF8FF] border border-[#B2DDFF] rounded-[12px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[14px] text-[#175CD3]">
                Set your target band to personalize your pathway and progress insights.
              </p>
              <button
                type="button"
                onClick={() => setShowTargetPrompt(true)}
                className="shrink-0 h-[38px] px-4 rounded-[8px] bg-[#175CD3] text-white text-[13px] font-semibold hover:bg-[#1349a8] transition-colors"
              >
                Set target band
              </button>
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onBack ? onBack() : navigate('/dashboard')}
                className="w-6 h-6 rounded-full border border-[#101828] flex items-center justify-center text-[#101828] hover:bg-black/5 transition-all bg-transparent"
              >
                <ArrowLeft size={14} strokeWidth={2} />
              </button>
              {/* Task type dropdown */}
              <div className="relative">
                <button
                  onClick={() => setTaskDropdownOpen(o => !o)}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <h1 className="text-[22px] md:text-[24px] font-bold text-[#101828] tracking-tight">
                    {TASK_LABELS[activeTask]}
                  </h1>
                  <ChevronDown size={22} className={`text-[#101828] mt-0.5 transition-transform ${taskDropdownOpen ? 'rotate-180' : ''}`} />
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
            <button onClick={handleExport} className="w-full md:w-auto px-6 h-[42px] bg-[#344054] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#1D2939] transition-all shadow-sm">
              Export Report
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar">
            {subTabs.map((tab) => (
              <div
                key={tab}
                className="relative py-4 cursor-pointer group whitespace-nowrap"
                onClick={() => setActiveTab(tab)}
              >
                <span className={`text-[13px] font-semibold transition-colors ${activeTab === tab ? "text-[#101828]" : "text-[#475467] group-hover:text-[#101828]"}`}>
                  {tab}
                </span>
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTabUnderlinePerformance"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1A96F3] rounded-t-full"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

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
          />
        : activeTab === "Detailed Breakdown" ?
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-[#E5E7EB] space-y-8">
            {/* Top Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#F8FAFC] rounded-[12px] px-6 py-5 flex items-center justify-between border border-[#E5E7EB]">
                <div>
                  <h4 className="text-[14px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Total Growth</h4>
                  <p className="text-[13px] text-[#667085] mt-0.5" style={{ fontFamily: "'Nunito', sans-serif" }}>Since First Attempt</p>
                </div>
                <span className="text-[24px] font-bold text-[#00C9B1]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{bandChange != null ? (parseFloat(bandChange) >= 0 ? `+${bandChange}` : bandChange) : '—'}</span>
              </div>
              <div className="bg-[#F8FAFC] rounded-[12px] px-6 py-5 flex items-center justify-between border border-[#E5E7EB]">
                <div>
                  <h4 className="text-[14px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Current Status</h4>
                  <p className="text-[13px] text-[#667085] mt-0.5" style={{ fontFamily: "'Nunito', sans-serif" }}>Overall Band Score</p>
                </div>
                <span className="text-[24px] font-bold text-[#00C9B1]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{latestBand ?? '—'}</span>
              </div>
              <div className="bg-[#F8FAFC] rounded-[12px] px-6 py-5 flex items-center justify-between border border-[#E5E7EB]">
                <div>
                  <h4 className="text-[14px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Your Goal</h4>
                  <p className="text-[13px] text-[#667085] mt-0.5" style={{ fontFamily: "'Nunito', sans-serif" }}>Target Band</p>
                </div>
                <span className="text-[24px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{targetBand.toFixed(1)}</span>
              </div>
            </div>

            {/* Tutor's Verdict */}
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-[16px] font-bold text-[#101828]">Tutor's Verdict</h3>
                <p className="text-[13px] text-[#667085] mt-0.5" style={{ fontFamily: "'Nunito', sans-serif" }}>Personalized assessment</p>
              </div>

              <p className="text-[15px] font-normal text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {latestBand != null
                  ? `${goalStatusText(latestBand, targetBand)}${bandChange != null ? ` Since your first attempt, your score has ${parseFloat(bandChange) >= 0 ? 'improved' : 'changed'} by ${parseFloat(bandChange) >= 0 ? '+' : ''}${bandChange}.` : ''}`
                  : 'Complete your first exam to see your personalized verdict.'}
              </p>

              {bandChange != null && Math.abs(parseFloat(bandChange)) < 0.5 && overallScores.length >= 3 && (
                <div className="bg-[#FFF9F2] border border-[#FFE4BA] rounded-[12px] px-5 py-4">
                  <p className="text-[14px] leading-relaxed text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <span className="text-[#DC6803] font-bold">Tutor Notice (Plateau):</span> You've been scoring exactly the same over the last 5 attempts (stagnant). This is a habit loop. Focus entirely on your highest priority Fix Cards to break it.
                  </p>
                </div>
              )}
            </div>

            {/* Pathway to target band */}
            <div className="space-y-4 pt-2 border-t border-[#F2F4F7]">
              <div className="pt-4">
                <h3 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Pathway to Band {targetBand.toFixed(1)}</h3>
                <p className="text-[14px] text-[#475467] leading-relaxed mt-1.5" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  If you raise one criterion by the shown delta (while others stay stable), your mean should cross the IELTS rounding threshold and your overall band can round up.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white border border-[#E5E7EB] rounded-[14px] px-6 py-5 shadow-sm flex flex-col gap-2">
                  <p className="text-[11px] text-[#98A2B3] font-bold uppercase tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>RAW Points Needed</p>
                  <p className="text-[22px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {formatGoalGap(latestBand, targetBand)}
                  </p>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-[14px] px-6 py-5 shadow-sm flex flex-col gap-2">
                  <p className="text-[11px] text-[#98A2B3] font-bold uppercase tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>Lowest Hanging Fruit</p>
                  <p className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {bottleneckCrit.avg != null ? bottleneckCrit.name : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        : activeTab === "Fix Cards" ?
          <div className="space-y-8">
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-4 md:px-8 py-4 md:py-5 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Fix Cards — Priority Errors</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Your most frequent error patterns across all submissions.</p>
               </div>
               <div className="p-4 md:p-8 space-y-3 md:space-y-4">
                 {frequentErrors.length === 0 ? (
                   <p className="text-[14px] text-gray-400 text-center py-8">Complete more exams to generate your Fix Cards.</p>
                 ) : frequentErrors.map((e, idx) => {
                   const isHigh = e.type === 'red' || e.impact === 'High Impact';
                   const isMed  = !isHigh && (e.type === 'yellow' || e.impact === 'Medium Impact');
                   const colors = isHigh ? "text-[#EA4335] bg-[#EA43351A] text-[14px]" : isMed ? "text-[#F59E0B] bg-[#F59E0B1A] text-[13px]" : "text-[#101828] bg-[#1018280D] text-[14px]";
                   const impact = isHigh ? 'High Impact' : isMed ? 'Medium Impact' : 'Low Impact';
                   return (
                     <div key={idx} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 p-4 md:p-6 bg-white border border-[#E5E7EB] rounded-[12px] hover:shadow-md transition-all">
                       <h4 className="text-[14px] md:text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{e.label}</h4>
                       <div className="flex items-center gap-3 md:gap-6 shrink-0">
                         <div className={`px-3 md:px-4 py-1.5 rounded-full font-bold ${colors} whitespace-nowrap text-center`} style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>{impact}</div>
                         <div className="px-3 md:px-4 py-1.5 bg-[#1018280D] rounded-full text-[13px] md:text-[14px] font-bold text-[#101828] whitespace-nowrap text-center" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Count: {e.count}</div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
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
        :
          <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
             <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                   <MoreHorizontal className="text-gray-300" />
                </div>
                <h3 className="text-[18px] font-bold text-[#101828]">{activeTab} Section</h3>
                <p className="text-gray-400 text-[14px]">This section is coming soon as part of your dynamic roadmap.</p>
             </div>
          </div>
        }
      </div>

      <LearningMaterialPromo />

      <TargetBandPrompt
        isOpen={showTargetPrompt}
        onClose={() => setShowTargetPrompt(false)}
        score={latestBand != null ? parseFloat(latestBand).toFixed(1) : null}
      />
    </div>
  );
};

export default PerformanceOverviewPage;