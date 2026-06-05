import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

const PerformanceOverviewPage = ({ onBack }) => {
  const navigate = useNavigate();
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
  const [latestReport, setLatestReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
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

  // Fetch the most recent Task 2 report whenever submissions or task filter changes
  useEffect(() => {
    const isT2 = activeTask.includes('Task 2');
    if (!isT2) { setLatestReport(null); return; }
    
    let cancelled = false;
    setReportLoading(true);
    
    // Fetch all submissions (limit 100) to find the most recent Task 2 overall
    api.getSubmissions({ limit: 100 })
      .then(res => {
        if (cancelled) return;
        const allSubs = res.data || [];
        const task2Subs = allSubs.filter(s => s.task_type === 'Task 2' && s.status === 'graded');
        if (task2Subs.length === 0) {
          setLatestReport(null);
          setReportLoading(false);
          return;
        }
        api.getReport(task2Subs[0].id)
          .then(r => { if (!cancelled) setLatestReport(r); })
          .catch(() => { if (!cancelled) setLatestReport(null); })
          .finally(() => { if (!cancelled) setReportLoading(false); });
      })
      .catch(() => {
        if (!cancelled) {
          setLatestReport(null);
          setReportLoading(false);
        }
      });
      
    return () => { cancelled = true; };
  }, [activeTask, submissions]);

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

  // Shared loading / empty-state wrapper for all Task 2 deep-analysis tabs.
  // contentFn is a thunk so latestReport is only accessed when it exists.
  const renderTask2Tab = (contentFn) => {
    if (reportLoading) return (
      <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
        <div className="w-8 h-8 border-4 border-[#1A96F3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
    if (!latestReport) return (
      <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
            <MoreHorizontal className="text-gray-300" />
          </div>
          <h3 className="text-[18px] font-bold text-[#101828]">No Task 2 Data Yet</h3>
          <p className="text-gray-400 text-[14px]">Complete a Task 2 exam to unlock this section.</p>
        </div>
      </div>
    );
    return contentFn();
  };

  // Reset sub-tab when task type changes (Task 1 / Task 2 have different sub-tabs)
  const handleTaskChange = (task) => {
    setActiveTask(task);
    setActiveTab("Overview");
    setTaskDropdownOpen(false);
  };

  const isTask2 = activeTask.includes("Task 2");
  const subTabs = isTask2
    ? ["Overview", "Error Analysis", "Dual Assessment", "Model Answer", "Vocabulary", "Grammar", "Data Structure", "Flow & Logic"]
    : ["Overview", "Detailed Breakdown", "Fix Cards", "Strategy", "14-Day sprint", "Templates & Pattern"];

  return (
    <div className="w-full">
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        {/* Gradient background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(90deg, #E0F2FE 0%, #FCE7F3 40%, #FCE7F3 60%, #CFFAFE 100%)',
          opacity: 0.8
        }}></div>

        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onBack ? onBack() : navigate('/reports')}
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

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 md:py-10">
        {activeTab === "Overview" ? 
          <div className="space-y-8">
            {/* Main Stats Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center h-auto md:h-[120px] divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]"
            >
              {/* Latest Band */}
              <div className="flex-1 px-8 md:pl-12 py-6 md:py-0 flex flex-col justify-center">
                <span className="text-[#101828] tracking-tighter" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '40px', lineHeight: '1' }}>
                  {loading ? '…' : latestBand ?? '—'}
                </span>
                <span className="text-[14px] text-[#667085] mt-1.5 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Latest Band</span>
              </div>

              {/* First */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>First</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{loading ? '…' : firstBand ?? '—'}</span>
              </div>

              {/* Average */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Average</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{loading ? '…' : avgBand ?? '—'}</span>
              </div>

              {/* Best */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Best</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{loading ? '…' : bestBand ?? '—'}</span>
              </div>

              {/* Change */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Change</span>
                <span className="text-[28px] font-semibold" style={{ fontFamily: "'Montserrat', sans-serif", color: bandChange && parseFloat(bandChange) >= 0 ? '#00C9B1' : '#EF4444' }}>
                  {loading ? '…' : bandChange ? (parseFloat(bandChange) >= 0 ? `+${bandChange}` : bandChange) : '—'}
                </span>
              </div>
            </motion.div>

            {/* Row 1: Profile, Summary, Strengths */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Activity Profile */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] h-auto md:h-[320px] flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-8 py-6 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]">Activity Profile</h3>
                </div>
                <div className="p-8 space-y-10 flex-1">
                  <div>
                    <p className="text-[14px] text-[#667085] mb-2 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Exam Completed</p>
                    <p className="text-[24px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{loading ? '…' : examCount}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#667085] mb-2 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Study Period</p>
                    <p className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{loading ? '…' : studyPeriod}</p>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] h-auto md:h-[320px] flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-8 py-6 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]">Executive Summary</h3>
                </div>
                <div className="p-8 space-y-10 flex-1">
                  <div className="space-y-2">
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{trendLabel}</p>
                    <p className="text-[16px] font-normal text-[#101828] leading-[1.3] tracking-[0px]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {trendDetail}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Top Priority Fixes</p>
                    <p className="text-[14.5px] font-normal text-[#101828] leading-[1.3] tracking-[0px]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {topPriorityText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="bg-white rounded-[24px] border border-[#E5E7EB] flex flex-col overflow-visible">
                <div className="px-8 py-6 border-b border-[#F2F4F7]">
                  <h3 className="text-[17px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Strengths & Weaknesses</h3>
                </div>
                <div className="p-8 space-y-5 flex-1">
                  <div className="px-6 py-5 bg-[#F4FCF9] rounded-[16px] border border-[#E6F8F3] flex items-start gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="text-[#30C3A9]" size={20} strokeWidth={2.5} />
                    </div>
                    <p className="text-[15px] leading-[1.6] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#30C3A9]">{strongestCrit.name}:</span>{' '}
                      <span className="font-bold text-[#101828]">{strongestCrit.avg != null ? `currently ${strongestCrit.avg.toFixed(1)}` : 'Complete exams to see data'}</span><br />
                      <span className="font-bold text-[#101828]">(Keep this stable while you lift your weakest areas).</span>
                    </p>
                  </div>
                  <div className="px-6 py-5 bg-[#FFF7F7] rounded-[16px] border border-[#FEEDED] flex items-start gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingDown className="text-[#EA4335]" size={20} strokeWidth={2.5} />
                    </div>
                    <p className="text-[15px] leading-[1.6] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#EA4335]">{bottleneckCrit.name}:</span>{' '}
                      <span className="font-bold text-[#101828]">{bottleneckCrit.avg != null ? `currently ${bottleneckCrit.avg.toFixed(1)}` : 'Complete exams to see data'}</span><br />
                      <span className="font-bold text-[#101828]">(This is your primary bottleneck, focus here).</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Skill Growth (2/3) & Mistake Frequency (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Skill Growth Chart */}
              <div className="lg:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-[#E5E7EB]">
                <h3 className="text-[18px] font-bold text-[#101828] mb-10">Skill Growth</h3>
                
                <div className="h-[320px] w-full mb-8">
                  {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-50/50 rounded-[16px] border border-gray-100 border-dashed">
                      <div className="w-8 h-8 border-4 border-[#1A96F3] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[13px] font-bold text-gray-400">Loading performance data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#101828', fontSize: 12, fontWeight: 700 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#101828', fontSize: 12, fontWeight: 700 }}
                          domain={[0, 9]}
                          ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                          interval={0}
                          tickFormatter={(value) => value.toFixed(1)}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                        />
                        <Line type="monotone" dataKey="overall" stroke="#EA4335" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="response" stroke="#F59E0B" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="coherence" stroke="#00C9B1" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="vocabulary" stroke="#8B62F3" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="grammar" stroke="#1A96F3" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Legend at Bottom */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-4 border-t border-gray-50">
                  {[
                    { label: "Overall Band", color: "#EA4335" },
                    { label: "Task Response", color: "#F59E0B" },
                    { label: "Coherence", color: "#00C9B1" },
                    { label: "Vocabulary", color: "#8B62F3" },
                    { label: "Grammar", color: "#1A96F3" }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[12px] font-bold text-[#101828]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mistake Frequency */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Mistake Frequency</h3>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  {/* Stats Bar */}
                  <div className="bg-[#F9FAFB] rounded-[12px] p-3 flex items-center justify-between mb-4">
                    <span className="text-[14px] font-semibold text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Total Instances: <span className="text-[#101828] font-bold">{totalInstances}</span>
                    </span>
                    <span className="text-[14px] font-semibold text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Unique Types: <span className="text-[#101828] font-bold">{uniqueTypes}</span>
                    </span>
                  </div>

                  {/* Mistake Rows */}
                  <div className="space-y-0 flex-1">
                    {frequentErrors.length === 0 ? (
                      <p className="text-[13px] text-gray-400 py-4">No error data yet. Complete more exams.</p>
                    ) : frequentErrors.slice(0, 6).map((item, index, arr) => {
                      const type = item.type === 'red' ? 'red' : item.type === 'yellow' ? 'yellow' : 'gray';
                      const colors = {
                        red:    "text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]",
                        yellow: "text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]",
                        gray:   "text-[#344054] bg-[#F2F4F7] border-[#D0D5DD]"
                      };
                      return (
                        <div key={index} className={`flex items-center justify-between py-3 ${index !== arr.length - 1 ? 'border-b border-[#F2F4F7]' : ''}`}>
                          <span className={`px-4 py-1.5 rounded-full border text-[13px] font-bold ${colors[type]}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {item.label}
                          </span>
                          <span className="px-4 py-1.5 bg-[#1018280D] rounded-full text-[13px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            Count: {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button className="text-[15px] font-bold text-[#101828] mt-6 hover:text-gray-600 transition-colors" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Load more...
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Grid of 3 columns (2 stacked card cols + 1 long list col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Col 1: Task Response & Lexical Resource */}
              <div className="space-y-8">
                {criterionCards.slice(0, 2).map(item => (
                  <div key={item.label} className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    <div className="px-8 py-5 border-b border-[#F2F4F7]">
                      <h4 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.label}</h4>
                    </div>
                    <div className="p-8 space-y-3 flex-1">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>First</span>
                        <span className="text-[16px] font-bold text-gray-400" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.first}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Latest</span>
                        <span className="text-[18px] font-normal text-[#101828B2]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.latest}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Growth</span>
                        <div className={`px-4 py-1.5 rounded-full text-[13px] font-bold border ${item.positive ? 'bg-[#F0FDF9] text-[#30C3A9] border-[#30C3A94D]' : 'bg-[#FFF5F5] text-[#EF4444] border-[#FEE2E2]'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {item.growth}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Col 2: Coherence & Grammatical */}
              <div className="space-y-8">
                {criterionCards.slice(2, 4).map(item => (
                  <div key={item.label} className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    <div className="px-8 py-5 border-b border-[#F2F4F7]">
                      <h4 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.label}</h4>
                    </div>
                    <div className="p-8 space-y-3 flex-1">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>First</span>
                        <span className="text-[16px] font-bold text-gray-400" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.first}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Latest</span>
                        <span className="text-[18px] font-normal text-[#101828B2]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.latest}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Growth</span>
                        <div className={`px-4 py-1.5 rounded-full text-[13px] font-bold border ${item.positive ? 'bg-[#F0FDF9] text-[#30C3A9] border-[#30C3A980]' : 'bg-[#FFF5F5] text-[#EF4444] border-[#FEE2E2]'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {item.growth}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Col 3: High-Impact Areas to Fix */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>High-Impact Areas to Fix</h3>
                </div>

                <div className="px-6 pt-0 pb-5 flex-1 flex flex-col">
                  <div className="space-y-0 flex-1">
                    {frequentErrors.length === 0 ? (
                      <p className="text-[14px] text-gray-400 py-4">No data yet.</p>
                    ) : frequentErrors.slice(0, 7).map((item, index, arr) => {
                      const type = item.type === 'red' ? 'red' : 'yellow';
                      const colors = {
                        red:    "text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]",
                        yellow: "text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]"
                      };
                      return (
                        <div key={index} className={`flex items-center justify-between ${index === arr.length - 1 ? 'pt-3 pb-1' : 'py-3'} ${index !== arr.length - 1 ? 'border-b border-[#F2F4F7]' : ''}`}>
                          <span className="text-[16px] font-bold text-[#344054]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {item.label}
                          </span>
                          <span className={`px-4 py-1.5 rounded-full border text-[14px] font-bold ${colors[type]}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {item.impact}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button className="w-full text-center text-[15px] font-bold text-[#101828] mt-0 hover:text-gray-600 transition-colors" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Load more...
                  </button>
                </div>
              </div>
            </div>
          </div>
        : activeTab === "Detailed Breakdown" ? 
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-[#E5E7EB] space-y-10">
            {/* Top Status Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#F8FAFC] rounded-[12px] p-6 flex items-center justify-between border border-gray-50/50">
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Total Growth</h4>
                  <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Since First Attempt</p>
                </div>
                <span className="text-[20px] font-bold text-[#00C9B1]">{bandChange != null ? (parseFloat(bandChange) >= 0 ? `+${bandChange}` : bandChange) : '—'}</span>
              </div>
              <div className="bg-[#F8FAFC] rounded-[12px] p-6 flex items-center justify-between border border-gray-50/50">
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Current Status</h4>
                  <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Overall Band Score</p>
                </div>
                <span className="text-[20px] font-bold text-[#00C9B1]">{latestBand ?? '—'}</span>
              </div>
            </div>

            {/* Tutor's Verdict */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-[16px] font-bold text-[#101828]">Tutor's Verdict</h3>
                <p className="text-[16px] font-normal text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Personalized assessment</p>
              </div>

              <div className="space-y-8">
                <p className="text-[15px] font-normal text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>
                  {latestBand != null
                    ? `You have reached an overall band of ${latestBand}${bandChange != null ? `, showing ${parseFloat(bandChange) >= 0 ? 'an improvement' : 'a change'} of ${parseFloat(bandChange) >= 0 ? '+' : ''}${bandChange} since your first attempt` : ''}. Keep applying the feedback to maintain this momentum.`
                    : 'Complete your first exam to see your personalized verdict.'}
                </p>

                {bandChange != null && Math.abs(parseFloat(bandChange)) < 0.5 && overallScores.length >= 3 && (
                  <div className="bg-[#FFF9F2] border border-[#FFE4BA] rounded-[12px] px-5 py-4">
                     <p className="text-[16.5px] leading-relaxed text-[#101828] font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>
                       <span className="text-[#DC6803] font-bold">Tutor Notice (Plateau):</span> Your score has been relatively stable across recent attempts. Focus entirely on your highest priority Fix Cards to break through.
                     </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pathway to Band 7.5 */}
            <div className="space-y-4 pt-4">
              <div className="space-y-4">
                <h3 className="text-[18px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Pathway to Band 7.5</h3>
                <p className="text-[16px] font-normal text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '140%' }}>
                  If you raise one criterion by the shown delta (while others stay stable), Your mean should cross the IELTS rounding the <br />
                  should and your overall band can round up.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-[16px] p-8 shadow-sm flex flex-col justify-center space-y-2 h-[110px]">
                   <p className="text-[13px] text-[#98A2B3] font-bold uppercase tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>RAW Points Needed</p>
                   <p className="text-[22px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                     {latestBand != null ? (latestBand >= 7.5 ? 'Target Reached' : `+${(7.5 - latestBand).toFixed(1)}`) : '—'}
                   </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-[16px] p-8 shadow-sm flex flex-col justify-center space-y-2 h-[110px]">
                   <p className="text-[13px] text-[#98A2B3] font-bold uppercase tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>Lowest Hanging Fruit</p>
                   <p className="text-[20px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                     {bottleneckCrit.avg != null ? bottleneckCrit.name : '—'}
                   </p>
                </div>
              </div>
            </div>
          </div>
        : activeTab === "Fix Cards" ?
          <div className="space-y-8">
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-5 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Fix Cards — Priority Errors</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Your most frequent error patterns across all submissions.</p>
               </div>
               <div className="p-8 space-y-4">
                 {frequentErrors.length === 0 ? (
                   <p className="text-[14px] text-gray-400 text-center py-8">Complete more exams to generate your Fix Cards.</p>
                 ) : frequentErrors.map((e, idx) => {
                   const isHigh = e.type === 'red' || e.impact === 'High Impact';
                   const isMed  = !isHigh && (e.type === 'yellow' || e.impact === 'Medium Impact');
                   const colors = isHigh ? "text-[#EA4335] bg-[#EA43351A] text-[14px]" : isMed ? "text-[#F59E0B] bg-[#F59E0B1A] text-[13px]" : "text-[#101828] bg-[#1018280D] text-[14px]";
                   const impact = isHigh ? 'High Impact' : isMed ? 'Medium Impact' : 'Low Impact';
                   return (
                     <div key={idx} className="flex items-center justify-between p-6 bg-white border border-[#E5E7EB] rounded-[12px] hover:shadow-md transition-all">
                       <div className="flex-1">
                         <h4 className="text-[16px] font-bold text-[#101828] mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>{e.label}</h4>
                       </div>
                       <div className="flex items-center gap-6">
                         <div className={`w-[130px] px-4 py-1.5 rounded-full font-bold ${colors} text-center`} style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>{impact}</div>
                         <div className="w-[100px] px-4 py-1.5 bg-[#1018280D] rounded-full text-[14px] font-bold text-[#101828] text-center" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Count: {e.count}</div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        : activeTab === "Strategy" ? 
          <div className="bg-white rounded-[24px] p-10 shadow-sm border border-gray-100 space-y-12">
            <h3 className="text-[18px] font-bold text-[#101828]">Strategic Roadmap</h3>
            
            {/* Strongest Area & Primary Bottleneck */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[12px] p-6">
                <span className="text-[14px] font-bold text-[#00C9B1] block mb-2">Strongest Area</span>
                <p className="text-[16px] font-medium text-[#101828]">{strongestCrit.name}</p>
              </div>
              <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-[12px] p-6">
                <span className="text-[14px] font-bold text-[#EA4335] block mb-2">Primary Bottleneck</span>
                <p className="text-[16px] font-medium text-[#101828]">{bottleneckCrit.name}</p>
              </div>
            </div>

            <div className="space-y-10">
              <h3 className="text-[16px] font-bold text-[#101828]">Recommended Workflow</h3>
              
              <div className="space-y-10">
                <div>
                  <h4 className="text-[14px] font-bold text-[#101828] mb-5">Drafting Phase</h4>
                  <ul className="space-y-4 font-sans">
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Plan 4 minutes: Position + 2 body ideas + examples.</p>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Write 30 minutes: Keep paragraphs balances; 1 example per body paragraph minimum.</p>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Check 6 minutes: Run your checklist (top 2 errors + referencing + articles + repetition).</p>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-[14px] font-bold text-[#101828] mb-5">Rewrite Recipe</h4>
                  <ul className="space-y-4 font-sans">
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Step 1: Fix task response (answer all parts; clear position).</p>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Step 2: Expand ideas (because + example).</p>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Step 3: Upgrade lexis (precise verbs/nouns; remove repetition).</p>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Step 4: Tighten cohesion (referencing; logical links).</p>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#101828] shrink-0"></div>
                      <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Step 5: Grammar sweep (SVA, articles, punctuation).</p>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Immediate Action Items */}
              <div className="bg-[#F0F9FF] border border-[#B9E6FE] rounded-[12px] p-10 mt-12">
                <h4 className="text-[15px] font-bold text-[#101828] mb-6">Immediate Action Items</h4>
                <ul className="space-y-5 font-sans">
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-[#101828] mt-2 shrink-0"></div>
                     <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>
                       Focus on the top {Math.min(2, frequentErrors.length)} error target{frequentErrors.length !== 1 ? 's' : ''} for 7 days
                       {frequentErrors[0] ? <span>: <strong>{frequentErrors[0].label}</strong></span> : null}
                       {frequentErrors[1] ? <span>, <strong>{frequentErrors[1].label}</strong></span> : null}.
                     </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-[#101828] mt-2 shrink-0"></div>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>In every body paragraph, add one mechanism sentence + one concrete example.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-[#101828] mt-2 shrink-0"></div>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Do a 6 minute checklist pass before submitting every essay.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        : activeTab === "14-Day sprint" ? 
          <div className="bg-white rounded-[24px] p-10 shadow-sm border border-gray-100 space-y-10">
            <div>
               <h3 className="text-[18px] font-bold text-[#101828] mb-4">Two-Week Hyper-Growth Sprint</h3>
               <div className="space-y-1.5">
                 <p className="text-[14px] text-[#101828]"><span className="font-bold">Pacing:</span> <span className="text-[#475467]">4 essays/week, 6 drills/week.</span></p>
                 <p className="text-[14px] text-[#101828]"><span className="font-bold">Review:</span> <span className="text-[#475467]">Every 7th day: compare top error counts and adjust priorities.</span></p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[
                 {
                   day: "Day 1: Set Up & Baseline",
                   tasks: [
                     "Let's look at your biggest score-killer right now: 'Repetition of Basic Lexis. Open your most recent essay and highlight every time you made this mistake",
                     "Pick 3 sentences where this happened and rewrite them so they are perfect",
                     "Write down a simple 3 step checklist on a sticky note to help you avoid this mistake next time."
                   ],
                   outcome: "3 perfectly rewritten sentences that prove you know how to avoid 'Repetition of Basic Lexis'."
                 },
                 {
                   day: "Day 2: Deep Dive: Repetition of Basic Lexis",
                   tasks: [
                     "Today is all about fixing 'Repetition of Basic Lexis'. Find a past essay where you scored lowest in Grammatical Range & Accuracy.",
                     "Spend 15 minutes editing \"only\" for 'Repetition of Basic Lexis' in that essay. Don't worry about anything else",
                     "Read your corrected sentences out loud to make sure they sound natural."
                   ],
                   outcome: "A clean, upgraded version of one body paragraph completely free of \"Repetition of Basic Lexis."
                 },
                 {
                   day: "Day 3: Targeting: Imprecise Word Choice",
                   tasks: [
                     "Your second biggest roadblock is 'Imprecise Word Choice'. Let's fix it today.",
                     "Write a brand new introduction and one body paragraph for any IELTS topic.",
                     "Before you consider it finished, spend 5 strict minutes checking specifically for 'Imprecise Word Choice'."
                   ],
                   outcome: "1 Intro and 1 body paragraph with zero \"Imprecise Word Choice mistakes."
                 },
                 {
                   day: "Day 4: Targeting: ideas Underdeveloped",
                   tasks: [
                     "Let's switch gears to 'Ideas Underdeveloped, which is also holding your score back.",
                     "Take a prompt you've struggled with before and build a quick outline (Main Idea -> Because -> Example).",
                     "Draft just one body paragraph from that outline, making sure you completely avoid making a 'Ideas Underdeveloped mistake."
                   ],
                   outcome: "A bulletproof body paragraph that nails the structure without 'Ideas Underdeveloped."
                 },
                 {
                   day: "Day 5: Combine and Conquer",
                   tasks: [
                     "Write two body paragraphs today. Your goal is tough: avoid 'Repetition of Basic Lexis' AND 'Imprecise Word Choice'.",
                     "Do not worry about the 40-minute time limit today. Focus entirely on quality, accuracy, and applying your new rules.",
                     "Use the templates provided in this report to structure your topic sentences clearly."
                   ],
                   outcome: "Two high-quality body paragraphs checking both of your top errors."
                 },
                 {
                   day: "Day 6: Full Timed Mock Test",
                   tasks: [
                     "Sit down in a quiet room and write a full Task 2 essay in exactly 40 minutes.",
                     "Save exactly 4 minutes at the end to proofread specifically for 'Repetition of Basic Lexis' and 'Imprecise Word Choice",
                     "Do not use any dictionary, notes, or grammar checkers. Treat this exactly like the real exam."
                   ],
                   outcome: "1 completed Task 2 essay written under strict exam conditions."
                 },
                 {
                   day: "Day 7: Review & Next Steps",
                   tasks: [
                     "Be your own examiner. Grade the essay you wrote yesterday using the checklist you made on Day 1.",
                     "Did you repeat the 'Repetition of Basic Lexis' mistake? If yes, write that specific sentence 3 times correctly to build muscle memory.",
                     "Rest and recharge. Consistent, focused practice is better than burning out."
                   ],
                   outcome: "A graded essay and a clear mind for next week."
                 },
                 {
                   day: "Day 8: Set Up & Baseline",
                   tasks: [
                     "Let's look at your biggest score-killer right now: 'Repetition of Basic Lexis Open your most recent essay and highlight every time you made this mistake.",
                     "Pick 3 sentences where this happened and rewrite them so they are perfect",
                     "Write down a simple 3 step checklist on a sticky note to help you avoid this mistake next time."
                   ],
                   outcome: "3 perfectly rewritten sentences that prove you know how to avoid 'Repetition of Basic Lexis'"
                 }
               ].map((card, idx) => (
                 <div key={idx} className="w-full bg-white border border-[#E5E7EB] rounded-[16px] flex flex-col overflow-hidden hover:shadow-md transition-all">
                    <div className="p-8 pb-0 flex flex-col">
                       <h4 className="text-[15px] font-bold text-[#101828] mb-5">{card.day}</h4>
                       <ul className="space-y-4 flex-1">
                          {card.tasks.map((task, tidx) => (
                            <li key={tidx} className="flex items-start gap-4">
                               <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-1.5 shrink-0"></div>
                               <p className="text-[14px] text-[#101828] leading-relaxed font-semibold">{task}</p>
                            </li>
                          ))}
                       </ul>
                    </div>
                    <div className="px-8 pt-1 pb-8 bg-white">
                       <p className="text-[13px] font-semibold text-[#00C9B1] leading-relaxed">
                         {card.outcome}
                       </p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        : activeTab === "Templates & Pattern" ? 
          <div className="space-y-4">
            {/* Templates & Best Patterns */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-3 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Templates & Best Patterns</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Leverage these carefully curated templates and your own highest-scoring patterns to draft faster and more accurately.</p>
               </div>
               
               <div className="p-5 space-y-3">
                  <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] p-4">
                    <p className="text-[16px] font-bold text-[#1A96F3] mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Balanced Discussion + Clear Position</p>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '115%' }}>
                      In contemporary society, will, artificial, believe, cause has become a widely debated issue. While some people<br />
                      argue that it brings clear benefits, others contend that it causes significant drawbacks. This essay will examine<br />
                      both perspectives and explain why I believe the advantages outweigh the disadvantages
                    </p>
                  </div>
                  <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] p-4">
                    <p className="text-[16px] font-bold text-[#1A96F3] mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Direct Thesis First (Band 7 + Style)</p>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '115%' }}>
                      I largely agree that will, artificial, believe, cause brings more benefits than harms, although some negative<br />
                      consequences remain. This essay will discuss both sides before presenting my position.
                    </p>
                  </div>
               </div>
            </div>

            {/* Topic Sentence Templates */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-3 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Topic Sentence Templates</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Versatile, high-scoring structures to elevate your writing.</p>
               </div>
               
               <div className="p-5 space-y-3">
                  <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] p-4">
                    <p className="text-[16px] font-bold text-[#1A96F3] mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>Reason + Mechanism</p>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>One key reason is that - this happens because</p>
                  </div>
                  <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] p-4">
                    <p className="text-[16px] font-bold text-[#1A96F3] mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>Example-Ready</p>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>A clear example of this can be seen when, which leads to</p>
                  </div>
                  <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] p-4">
                    <p className="text-[16px] font-bold text-[#1A96F3] mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>Concession</p>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Although is a valid concern is more significant because</p>
                  </div>
               </div>
            </div>

            {/* Conclusion + Condition */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-3 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Conclusion + Condition</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Summarize effectively to leave a confident, lasting impression.</p>
               </div>
               
               <div className="p-5">
                  <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] p-4">
                    <p className="text-[16px] font-bold text-[#1A96F3] mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Weighing + Condition</p>
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '115%' }}>
                      In conclusion, although will, artificial, believe, cause can create certain problems, its overall impact is positive.<br />
                      These benefits are strongest when policymakers apply sensible regulation to limit
                    </p>
                  </div>
               </div>
            </div>
          </div>
        : activeTab === "Error Analysis" ? renderTask2Tab(() => {
            const sevColors = { Major: 'text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]', High: 'text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]', Medium: 'text-[#344054] bg-[#F2F4F7] border-[#D0D5DD]', Low: 'text-[#475467] bg-[#F9FAFB] border-[#E4E7EC]' };
            const groups = ['Task Response','Coherence & Cohesion','Lexical Resource','Grammatical Range & Accuracy']
              .map(c => ({ criteria: c, errors: (latestReport.errors || []).filter(e => e.criteria === c) }))
              .filter(g => g.errors.length > 0);
            return (
              <div className="space-y-8">
                {groups.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-10 text-center border border-gray-100 shadow-sm"><p className="text-[14px] text-gray-400">No errors recorded for this submission.</p></div>
                ) : groups.map((group, gi) => (
                  <div key={gi} className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
                    <div className="px-8 py-5 border-b border-[#F2F4F7]">
                      <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{group.criteria}</h3>
                      <p className="text-[13px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>{group.errors.length} error{group.errors.length !== 1 ? 's' : ''} identified</p>
                    </div>
                    <div className="p-8 space-y-5">
                      {group.errors.map((err, ei) => (
                        <div key={ei} className="border border-[#E5E7EB] rounded-[16px] p-6 space-y-4 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{err.title}</h4>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-3 py-1 rounded-full border text-[12px] font-bold ${sevColors[err.severity] || sevColors.Medium}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{err.severity}</span>
                              <span className="px-3 py-1 rounded-full bg-[#F2F4F7] border border-[#E4E7EC] text-[12px] font-bold text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>{err.sub_category}</span>
                            </div>
                          </div>
                          {err.location_text && <p className="text-[12px] text-[#667085] font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>{err.location_text}</p>}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#FEF3F2] border border-[#FDA29B] rounded-[10px] px-4 py-3">
                              <p className="text-[11px] font-bold text-[#D92D20] mb-1.5" style={{ fontFamily: "'Nunito', sans-serif" }}>ORIGINAL</p>
                              <p className="text-[14px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{err.original_text}</p>
                            </div>
                            <div className="bg-[#F0FDF9] border border-[#6EE7B7] rounded-[10px] px-4 py-3">
                              <p className="text-[11px] font-bold text-[#059669] mb-1.5" style={{ fontFamily: "'Nunito', sans-serif" }}>CORRECTION</p>
                              <p className="text-[14px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{err.correction_text}</p>
                            </div>
                          </div>
                          <p className="text-[14px] text-[#475467] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{err.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        : activeTab === "Dual Assessment" ? renderTask2Tab(() => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
                <div className="px-8 py-5 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Strengths</h3>
                  <p className="text-[13px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>What you did well in this submission</p>
                </div>
                <div className="p-8 space-y-4 flex-1">
                  {(latestReport.strengths || []).map((s, i) => (
                    <div key={i} className="px-6 py-4 bg-[#F4FCF9] rounded-[12px] border border-[#E6F8F3] flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-[#30C3A9] mt-2 shrink-0" />
                      <p className="text-[15px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
                <div className="px-8 py-5 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Weaknesses</h3>
                  <p className="text-[13px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Areas that lowered your band score</p>
                </div>
                <div className="p-8 space-y-4 flex-1">
                  {(latestReport.weaknesses || []).map((w, i) => (
                    <div key={i} className="px-6 py-4 bg-[#FFF7F7] rounded-[12px] border border-[#FEEDED] flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-[#EA4335] mt-2 shrink-0" />
                      <p className="text-[15px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        : activeTab === "Model Answer" ? renderTask2Tab(() => !latestReport.model_answer ? (
            <div className="bg-white rounded-[24px] p-10 text-center border border-gray-100 shadow-sm"><p className="text-[14px] text-gray-400">Model answer not available for this submission.</p></div>
          ) : (
            <div className="space-y-8">
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                <div className="px-8 py-5 border-b border-[#F2F4F7] flex items-center justify-between">
                  <div>
                    <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Band 8.0 Model Answer</h3>
                    <p className="text-[13px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Written for the same prompt at a higher band level</p>
                  </div>
                  <span className="px-4 py-1.5 bg-[#F0FDF9] border border-[#6EE7B7] rounded-full text-[13px] font-bold text-[#059669]" style={{ fontFamily: "'Nunito', sans-serif" }}>Band {latestReport.model_answer.estimated_band ?? 8.0}</span>
                </div>
                <div className="p-8">
                  <p className="text-[16px] text-[#101828] leading-[1.8] whitespace-pre-wrap" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.model_answer.text}</p>
                </div>
              </div>
              {(latestReport.model_answer.key_changes || []).length > 0 && (
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]">
                    <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Key Improvements vs Your Essay</h3>
                  </div>
                  <div className="p-8 space-y-4">
                    {latestReport.model_answer.key_changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-full bg-[#1A96F3] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[15px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{change}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        : activeTab === "Vocabulary" ? renderTask2Tab(() => !latestReport.vocabulary_analysis ? (
            <div className="bg-white rounded-[24px] p-10 text-center border border-gray-100 shadow-sm"><p className="text-[14px] text-gray-400">Vocabulary analysis not available for this submission.</p></div>
          ) : (
            <div className="space-y-8">
              {(latestReport.vocabulary_analysis.categories || []).map((cat, ci) => (
                <div key={ci} className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]">
                    <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{cat.name}</h3>
                    {cat.description && <p className="text-[13px] text-[#475467] mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>{cat.description}</p>}
                  </div>
                  <div className="p-8 space-y-4">
                    {(cat.words || []).map((word, wi) => (
                      <div key={wi} className="border border-[#E5E7EB] rounded-[12px] p-5 space-y-2 hover:shadow-sm transition-all">
                        <p className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{word.word}</p>
                        <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}><span className="font-semibold text-[#101828]">Definition:</span> {word.definition}</p>
                        <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[8px] px-4 py-2.5">
                          <p className="text-[14px] text-[#101828] italic" style={{ fontFamily: "'Nunito', sans-serif" }}>{word.example}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        : activeTab === "Grammar" ? renderTask2Tab(() => !latestReport.grammar_analysis ? (
            <div className="bg-white rounded-[24px] p-10 text-center border border-gray-100 shadow-sm"><p className="text-[14px] text-gray-400">Grammar analysis not available for this submission.</p></div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]"><h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Grammar Strengths</h3></div>
                  <div className="p-8"><p className="text-[15px] text-[#101828] leading-[1.7]" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.grammar_analysis.overview_strengths}</p></div>
                </div>
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]"><h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Grammar Weaknesses</h3></div>
                  <div className="p-8"><p className="text-[15px] text-[#101828] leading-[1.7]" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.grammar_analysis.overview_weaknesses}</p></div>
                </div>
              </div>
              {(latestReport.grammar_analysis.structures_used || []).length > 0 && (
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]"><h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Grammatical Structures Used</h3></div>
                  <div className="p-8 flex flex-wrap gap-3">
                    {latestReport.grammar_analysis.structures_used.map((s, i) => (
                      <span key={i} className="px-4 py-2 bg-[#F0F9FF] border border-[#E0F2FE] rounded-full text-[13px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(latestReport.grammar_analysis.enrichment_suggestions || []).length > 0 && (
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]"><h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Enrichment Suggestions</h3></div>
                  <div className="p-8 space-y-5">
                    {latestReport.grammar_analysis.enrichment_suggestions.map((sug, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-[14px] p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#FEF3F2] border border-[#FDA29B] rounded-[10px] px-4 py-3">
                            <p className="text-[11px] font-bold text-[#D92D20] mb-1.5" style={{ fontFamily: "'Nunito', sans-serif" }}>ORIGINAL</p>
                            <p className="text-[14px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{sug.original}</p>
                          </div>
                          <div className="bg-[#F0FDF9] border border-[#6EE7B7] rounded-[10px] px-4 py-3">
                            <p className="text-[11px] font-bold text-[#059669] mb-1.5" style={{ fontFamily: "'Nunito', sans-serif" }}>IMPROVED</p>
                            <p className="text-[14px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{sug.improved}</p>
                          </div>
                        </div>
                        <p className="text-[14px] text-[#475467] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{sug.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(latestReport.grammar_analysis.expert_tips || []).length > 0 && (
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]"><h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Expert Grammar Tips</h3></div>
                  <div className="p-8 space-y-4">
                    {latestReport.grammar_analysis.expert_tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-full bg-[#8B62F3] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[15px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        : activeTab === "Data Structure" ? renderTask2Tab(() => !latestReport.data_structure_analysis ? (
            <div className="bg-white rounded-[24px] p-10 text-center border border-gray-100 shadow-sm"><p className="text-[14px] text-gray-400">Data structure analysis not available for this submission.</p></div>
          ) : (
            <div className="space-y-8">
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                <div className="px-8 py-5 border-b border-[#F2F4F7] flex items-center justify-between">
                  <div><h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Structure Overview</h3></div>
                  {latestReport.data_structure_analysis.task_achievement_rating && (
                    <span className={`px-4 py-1.5 rounded-full text-[13px] font-bold border ${{ Excellent: 'bg-[#F0FDF9] border-[#6EE7B7] text-[#059669]', Good: 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1]', Adequate: 'bg-[#FFFAEB] border-[#FEC84B] text-[#DC6803]' }[latestReport.data_structure_analysis.task_achievement_rating] || 'bg-[#FEF3F2] border-[#FDA29B] text-[#D92D20]'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {latestReport.data_structure_analysis.task_achievement_rating}
                    </span>
                  )}
                </div>
                <div className="p-8 space-y-4">
                  <p className="text-[15px] text-[#101828] leading-[1.7]" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.data_structure_analysis.overview}</p>
                  {latestReport.data_structure_analysis.task_achievement_feedback && (
                    <div className="bg-[#F0F9FF] border border-[#E0F2FE] rounded-[12px] px-5 py-4">
                      <p className="text-[14px] text-[#101828] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.data_structure_analysis.task_achievement_feedback}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Introduction', strengths: latestReport.data_structure_analysis.introduction_strengths, weaknesses: latestReport.data_structure_analysis.introduction_weaknesses },
                  { label: 'Body Paragraphs', detail: latestReport.data_structure_analysis.body_analysis },
                  { label: 'Conclusion', strengths: latestReport.data_structure_analysis.conclusion_strengths, weaknesses: latestReport.data_structure_analysis.conclusion_weaknesses },
                ].map((section, si) => (
                  <div key={si} className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#F2F4F7]"><h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{section.label}</h4></div>
                    <div className="p-6 space-y-3">
                      {section.detail ? (
                        <p className="text-[14px] text-[#475467] leading-[1.7]" style={{ fontFamily: "'Nunito', sans-serif" }}>{section.detail}</p>
                      ) : (
                        <>
                          {(section.strengths || []).map((s, i) => (
                            <div key={`s${i}`} className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#30C3A9] mt-1.5 shrink-0" />
                              <p className="text-[14px] text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{s}</p>
                            </div>
                          ))}
                          {(section.weaknesses || []).map((w, i) => (
                            <div key={`w${i}`} className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#EA4335] mt-1.5 shrink-0" />
                              <p className="text-[14px] text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{w}</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        : activeTab === "Flow & Logic" ? renderTask2Tab(() => !latestReport.data_structure_analysis ? (
            <div className="bg-white rounded-[24px] p-10 text-center border border-gray-100 shadow-sm"><p className="text-[14px] text-gray-400">Flow analysis not available for this submission.</p></div>
          ) : (
            <div className="space-y-8">
              {latestReport.data_structure_analysis.transition_analysis && (
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]">
                    <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Transition & Flow Analysis</h3>
                    <p className="text-[13px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>How well your ideas connect and flow between paragraphs</p>
                  </div>
                  <div className="p-8"><p className="text-[15px] text-[#101828] leading-[1.7]" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.data_structure_analysis.transition_analysis}</p></div>
                </div>
              )}
              {latestReport.data_structure_analysis.authenticity_feedback && (
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                  <div className="px-8 py-5 border-b border-[#F2F4F7]">
                    <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Authenticity & Naturalness</h3>
                    <p className="text-[13px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>How natural and genuine your writing sounds to an examiner</p>
                  </div>
                  <div className="p-8"><p className="text-[15px] text-[#101828] leading-[1.7]" style={{ fontFamily: "'Nunito', sans-serif" }}>{latestReport.data_structure_analysis.authenticity_feedback}</p></div>
                </div>
              )}
            </div>
          ))
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
    </div>
  );
};

export default PerformanceOverviewPage;