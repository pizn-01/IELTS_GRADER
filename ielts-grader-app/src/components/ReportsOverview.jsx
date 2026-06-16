import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportView from './ReportView';
import { api } from '../services/api';
import { ArrowLeft, ChevronDown, TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal, Search, Calendar, FileText, ChevronRight, Download, Eye, AlertTriangle, TrendingDown, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Hardcoded chartData removed — replaced by analyticsData.chartData from API

const ReportsOverview = ({ onBack }) => {
  const navigate = useNavigate();
  const [isDetailView, setIsDetailView] = useState(false);
  const [activeTask, setActiveTask] = useState("Academic Task 1");
  const [activeTab, setActiveTab] = useState("Overview");
  const [submissions, setSubmissions] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(null); // submission id being opened
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSubmissions = submissions.filter(sub => {
    // 1. Search term match (matches exam_type, task_type or essay_content)
    const matchesSearch = 
      !searchTerm.trim() ||
      (sub.exam_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.task_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.essay_content || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (dateFilter === 'All Time') return true;
    
    const createdDate = new Date(sub.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'Today') {
      return createdDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'Last 7 Days') {
      return diffDays <= 7;
    } else if (dateFilter === 'Last 30 Days') {
      return diffDays <= 30;
    }
    return true;
  });

  useEffect(() => {
    // Clear stale data immediately when task changes to avoid flashing old content
    setSubmissions([]);
    setAnalyticsData(null);
    setLoadingSubmissions(true);
    setLoadingAnalytics(true);
    // Reset sub-navigation tab when switching tasks
    setActiveTab('Overview');

    api.getSubmissions({ taskType: activeTask })
      .then(res => setSubmissions(res.data || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoadingSubmissions(false));

    api.getDashboardAnalytics({ taskType: activeTask })
      .then(d => setAnalyticsData(d))
      .catch(() => setAnalyticsData({ chartData: [], frequentErrors: [] }))
      .finally(() => setLoadingAnalytics(false));
  }, [activeTask]);

  const handleOpenReport = async (submission) => {
    if (submission.status !== 'graded') return;
    setLoadingReport(submission.id);
    try {
      const report = await api.getReport(submission.id);
      navigate('/report', { state: { reportData: { ...report, examType: submission.exam_type, taskType: submission.task_type } } });
    } catch {
      navigate('/reports');
    } finally {
      setLoadingReport(null);
    }
  };

  // Stats derived from real analytics data
  const liveChartData = analyticsData?.chartData || [];
  const overallScores = liveChartData.map(d => d.overall).filter(Boolean);
  const latestBand  = overallScores[overallScores.length - 1] ?? null;
  const firstBand   = overallScores[0] ?? null;
  const avgBand     = overallScores.length ? (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(1) : null;
  const bestBand    = overallScores.length ? Math.max(...overallScores).toFixed(1) : null;
  const rawChange   = (latestBand != null && firstBand != null) ? (latestBand - firstBand).toFixed(1) : null;
  const bandColor   = (b) => b >= 7.0 ? '#00C9B1' : b >= 5.5 ? '#F59E0B' : '#EF4444';

  // Mistake frequency — derived from real API data
  const sortedErrors = (analyticsData?.frequentErrors || []).slice().sort((a, b) => b.count - a.count);
  const totalInstances = sortedErrors.reduce((sum, e) => sum + (e.count || 0), 0);
  const uniqueTypes = sortedErrors.length;

  // Criterion trend cards — first / latest / growth from chart data
  const criterionCards = [
    { label: "Task Response",   field: "response" },
    { label: "Lexical Resource",field: "vocabulary" },
    { label: "Coherence",       field: "coherence" },
    { label: "Grammatical",     field: "grammar" },
  ].map(c => {
    const vals = liveChartData.map(d => d[c.field]).filter(v => v != null);
    const first  = vals.length > 0 ? parseFloat(vals[0]).toFixed(1) : null;
    const latest = vals.length > 0 ? parseFloat(vals[vals.length - 1]).toFixed(1) : null;
    const growth = (first && latest) ? (parseFloat(latest) - parseFloat(first)).toFixed(1) : null;
    return {
      label: c.label,
      first:  first  ?? '—',
      latest: latest ?? '—',
      growth: growth != null ? (parseFloat(growth) >= 0 ? `+${growth}` : growth) : '—',
      positive: growth != null ? parseFloat(growth) >= 0 : true,
    };
  });

  // Activity Profile — real counts and date range from submissions
  const gradedSubs = submissions.filter(s => s.status === 'graded');
  const examCount  = gradedSubs.length;
  const studyPeriod = (() => {
    if (gradedSubs.length === 0) return 'No exams yet';
    const dates = gradedSubs.map(s => new Date(s.created_at)).sort((a, b) => a - b);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', d: 'numeric', year: 'numeric' });
    if (dates.length === 1) return fmt(dates[0]);
    return `${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  // Executive Summary — trend + top priorities from real error data
  const trendLabel = rawChange == null ? 'Getting Started' : parseFloat(rawChange) > 0.4 ? 'On the Rise' : parseFloat(rawChange) < -0.4 ? 'Declining' : 'Holding Steady';
  const trendDetail = rawChange == null
    ? 'Complete your first exam to begin tracking progress.'
    : parseFloat(rawChange) >= 0
    ? `Overall improvement: +${rawChange} from first to latest attempt.`
    : `Overall change: ${rawChange} from first to latest attempt.`;
  const topPriorities = (analyticsData?.frequentErrors || [])
    .filter(e => e.type === 'red' || e.impact === 'High Impact')
    .slice(0, 3)
    .map(e => e.label);
  const topPriorityText = topPriorities.length > 0
    ? `Focus on reducing: ${topPriorities.join(', ')}.`
    : 'Complete more exams to identify patterns.';

  // Core Strengths — criteria with fewest high-impact errors
  const criteriaErrorCount = {};
  (analyticsData?.frequentErrors || []).forEach(e => {
    const c = e.label?.split(' ')[0] || e.label;
    criteriaErrorCount[c] = (criteriaErrorCount[c] || 0) + e.count;
  });
  const criteriaScores = [
    { name: 'Coherence & Cohesion', band: overallScores.length ? (liveChartData.reduce((s, d) => s + (d.coherence || 0), 0) / liveChartData.length).toFixed(1) : null },
    { name: 'Lexical Resource', band: overallScores.length ? (liveChartData.reduce((s, d) => s + (d.vocabulary || 0), 0) / liveChartData.length).toFixed(1) : null },
    { name: 'Task Response', band: overallScores.length ? (liveChartData.reduce((s, d) => s + (d.response || 0), 0) / liveChartData.length).toFixed(1) : null },
    { name: 'Grammar', band: overallScores.length ? (liveChartData.reduce((s, d) => s + (d.grammar || 0), 0) / liveChartData.length).toFixed(1) : null },
  ].filter(c => c.band && parseFloat(c.band) > 0).sort((a, b) => parseFloat(b.band) - parseFloat(a.band)).slice(0, 2);

  if (!isDetailView) {
    return (
      <div className="w-full bg-white min-h-[calc(100vh-80px)]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-10 space-y-10">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-[32px] md:text-[36px] font-bold text-[#101828] tracking-tight">Reports</h1>
            <p className="text-[14px] md:text-[16px] text-gray-400 font-medium tracking-tight">Choose a task to analyze performance or review past attempts.</p>
          </div>

          {/* Task Selection Tabs */}
          <div className="flex items-center gap-8 md:gap-10 border-b border-gray-100 overflow-x-auto no-scrollbar">
            {["Academic Task 1", "Academic Task 2", "General Task 1", "General Task 2"].map((task) => (
              <div 
                key={task} 
                className="relative py-4 cursor-pointer group whitespace-nowrap"
                onClick={() => setActiveTask(task)}
              >
                <span className={`text-[14px] font-bold transition-colors ${activeTask === task ? "text-[#101828]" : "text-gray-400 group-hover:text-gray-700"}`}>
                  {task}
                </span>
                {activeTask === task && (
                  <motion.div 
                    layoutId="activeLandingTab"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1A96F3] rounded-t-full" 
                  />
                )}
              </div>
            ))}
          </div>

          {/* High-Level Performance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="50" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                  <circle cx="56" cy="56" r="50" fill="none" stroke="#1A96F3" strokeWidth="8" strokeDasharray="314.159" strokeDashoffset={latestBand != null ? (314.159 * (1 - (latestBand / 9))).toFixed(2) : 314.159} strokeLinecap="round" />
                </svg>
                <span className="absolute text-[22px] font-black text-[#101828]">{latestBand ?? '—'}</span>
              </div>
              <div>
                <h2 className="text-[24px] md:text-[28px] font-bold text-[#101828] mb-2">{activeTask}</h2>
                <div className="flex items-center justify-center md:justify-start gap-4 text-[14px] font-bold">
                  <span className="text-gray-400">Attempts: <span className="text-[#101828]">{submissions.filter(s => s.status === 'graded').length}</span></span>
                  {overallScores.length >= 2 && (
                    <span style={{ color: overallScores[overallScores.length-1] >= overallScores[0] ? '#00C9B1' : '#EF4444' }}>
                      {overallScores[overallScores.length-1] >= overallScores[0] ? '+' : ''}{(overallScores[overallScores.length-1] - overallScores[0]).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/performance?task=${encodeURIComponent(activeTask)}`)}
              className="w-full md:w-auto px-10 h-[48px] bg-[#2C3E50] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
            >
              View Performance
            </button>
          </motion.div>

          {/* History List */}
          <div className="space-y-8">
            <h3 className="text-[20px] font-bold text-[#101828]">View Exam History</h3>
            
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1A96F3] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search essays..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 h-[52px] bg-white border border-gray-100 rounded-[14px] text-[14px] focus:outline-none focus:border-[#1A96F3] focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-400"
                />
              </div>
              <div className="relative z-30" ref={dateDropdownRef}>
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="w-full md:w-[200px] pl-12 pr-10 h-[52px] bg-white border border-gray-100 rounded-[14px] text-[14px] text-left focus:outline-none focus:border-[#1A96F3] transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[#101828] font-medium">
                    {dateFilter}
                  </span>
                  <ChevronDown className="text-gray-400" size={18} />
                </button>
                
                {showDateDropdown && (
                  <div className="absolute right-0 mt-2 w-full md:w-[200px] bg-white border border-gray-100 rounded-[14px] shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setDateFilter(option);
                          setShowDateDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors hover:bg-gray-50 ${
                          dateFilter === option ? 'text-[#1A96F3] font-bold bg-blue-50/40' : 'text-[#344054]'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* List */}
            <div className="space-y-4">
              {loadingSubmissions ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white border border-gray-100 rounded-[16px] p-6 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-gray-100 rounded-[12px]" />
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-100 rounded w-36" />
                            <div className="h-3 bg-gray-100 rounded w-24" />
                          </div>
                        </div>
                        <div className="h-8 w-16 bg-gray-100 rounded-[10px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-[14px] font-medium">No submissions yet. Complete an exam to see your reports here.</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-[14px] font-medium">No submissions found matching your filters.</p>
                </div>
              ) : filteredSubmissions.map((sub) => {
                const score = sub.overall_band;
                const color = score ? bandColor(score) : '#9CA3AF';
                const dateStr = new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const label = `${sub.exam_type} ${sub.task_type}`;
                const isLoading = loadingReport === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleOpenReport(sub)}
                    className={`bg-white border border-gray-100 rounded-[16px] p-6 flex items-center justify-between hover:border-blue-100 hover:bg-blue-50/20 transition-all group ${sub.status === 'graded' ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-[12px] bg-blue-50 flex items-center justify-center text-[#1A96F3] group-hover:bg-[#1A96F3] group-hover:text-white transition-all">
                        <TrendingUp size={22} />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-[#101828] mb-1">{label}</h4>
                        <p className="text-[14px] text-gray-400 font-medium">{dateStr}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="px-5 py-1.5 bg-gray-50 text-gray-400 rounded-full text-[12px] font-bold uppercase tracking-wider">
                        {sub.status === 'grading' ? 'Grading…' : sub.status === 'failed' ? 'Failed' : sub.word_count ? `${sub.word_count}w` : sub.task_type}
                      </span>
                      <div className="w-[60px] h-[34px] border rounded-[10px] flex items-center justify-center text-[14px] font-black" style={{ color, borderColor: color + '33', backgroundColor: color + '0D' }}>
                        {isLoading ? '…' : score ? score.toFixed(1) : '—'}
                      </div>
                      <button className="p-2 text-gray-300 hover:text-[#1A96F3] transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="-mx-4 md:-mx-8">
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        {/* Exact Linear Gradient from gr.png */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(90deg, #E0F2FE 0%, #FCE7F3 40%, #FCE7F3 60%, #CFFAFE 100%)',
          opacity: 0.8
        }}></div>
        
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDetailView(false)}
                className="w-6 h-6 rounded-full border border-[#101828] flex items-center justify-center text-[#101828] hover:bg-black/5 transition-all bg-transparent"
              >
                <ArrowLeft size={14} strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2 cursor-pointer group">
                <h1 className="text-[22px] md:text-[24px] font-bold text-[#101828] tracking-tight">{activeTask}</h1>
                <ChevronDown size={22} className="text-[#101828] mt-0.5" />
              </div>
            </div>
            <button className="w-full md:w-auto px-6 h-[42px] bg-[#344054] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#1D2939] transition-all shadow-sm">
              Export Report
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {(activeTask.includes("Task 2") 
              ? ["Overview", "Error Analysis", "Dual Assessment", "Model Answer", "Vocabulary", "Grammar", "Data Structure", "Flow & Logic"]
              : ["Overview", "Detailed Breakdown", "Fix Cards", "Strategy", "14-Day sprint", "Templates & Pattern"]
            ).map((tab) => (
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
                    layoutId="activeTabUnderline"
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
              className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm flex items-center h-[120px]"
            >
              {/* Latest Band */}
              <div className="flex-1 pl-12 flex flex-col justify-center">
                {loadingAnalytics ? (
                  <div className="h-10 w-16 bg-gray-100 rounded animate-pulse mb-1" />
                ) : (
                  <span className="text-[#101828] tracking-tighter" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '40px', lineHeight: '1' }}>{latestBand ?? '—'}</span>
                )}
                <span className="text-[14px] text-[#667085] mt-1.5 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Latest Band</span>
              </div>

              <div className="w-px h-[60px] bg-[#E5E7EB]"></div>

              {/* First */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>First</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{firstBand ?? '—'}</span>
              </div>

              <div className="w-px h-[60px] bg-[#E5E7EB]"></div>

              {/* Average */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Average</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{avgBand ?? '—'}</span>
              </div>

              <div className="w-px h-[60px] bg-[#E5E7EB]"></div>

              {/* Best */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Best</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{bestBand ?? '—'}</span>
              </div>

              <div className="w-px h-[60px] bg-[#E5E7EB]"></div>

              {/* Change */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Change</span>
                <span className="text-[28px] font-semibold" style={{ fontFamily: "'Montserrat', sans-serif", color: rawChange == null ? '#101828' : parseFloat(rawChange) >= 0 ? '#00C9B1' : '#EF4444' }}>
                  {rawChange == null ? '—' : parseFloat(rawChange) >= 0 ? `+${rawChange}` : rawChange}
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
                    <p className="text-[14px] text-[#667085] mb-2 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Exams Completed</p>
                    <p className="text-[24px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{examCount}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#667085] mb-2 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Study Period</p>
                    <p className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{studyPeriod}</p>
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

              {/* Core Strengths */}
              <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] h-auto md:h-[320px] flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-8 py-6 border-b border-[#F2F4F7]">
                  <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '20px' }}>Core Strengths</h3>
                </div>
                <div className="p-8 space-y-5 flex-1">
                  {criteriaScores.length > 0 ? criteriaScores.map((c, i) => (
                    <div key={i} className="p-5 bg-[#F0FDF9] rounded-[20px] border border-[#CCFBEF] flex items-center">
                      <p className="text-[16px] leading-[1.5] tracking-[0px]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        <span className="font-bold text-[#30C3A9]">{c.name}:</span>{' '}
                        <span className="font-bold text-[#101828]">avg {c.band} — keep this stable while lifting weaker areas.</span>
                      </p>
                    </div>
                  )) : (
                    <p className="text-[14px] text-gray-400 font-medium p-2">Complete more exams to identify your core strengths.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Skill Growth (2/3) & Mistake Frequency (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Skill Growth Chart */}
              <div className="lg:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-[#E5E7EB]">
                <h3 className="text-[18px] font-bold text-[#101828] mb-10">Skill Growth</h3>
                
                <div className="h-[320px] w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveChartData.length > 0 ? liveChartData : []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                        domain={[5.5, 9]}
                        ticks={[5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]}
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
                    {sortedErrors.length === 0 ? (
                      <p className="text-[13px] text-gray-400 py-4">No error data yet. Complete more exams to see patterns.</p>
                    ) : sortedErrors.slice(0, 6).map((item, index, arr) => {
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
                    {sortedErrors.length === 0 ? (
                      <p className="text-[14px] text-gray-400 py-4">No data yet.</p>
                    ) : sortedErrors.slice(0, 7).map((item, index, arr) => {
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
                <span className="text-[20px] font-bold" style={{ color: rawChange == null ? '#101828' : parseFloat(rawChange) >= 0 ? '#00C9B1' : '#EF4444' }}>
                  {rawChange == null ? '—' : parseFloat(rawChange) >= 0 ? `+${rawChange}` : rawChange}
                </span>
              </div>
              <div className="bg-[#F8FAFC] rounded-[12px] p-6 flex items-center justify-between border border-gray-50/50">
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Current Status</h4>
                  <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Overall Band Score</p>
                </div>
                <span className="text-[20px] font-bold" style={{ color: latestBand != null ? bandColor(latestBand) : '#101828' }}>
                  {latestBand ?? '—'}
                </span>
              </div>
            </div>

            {/* Tutor's Verdict */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-[16px] font-bold text-[#101828]">Tutor's Verdict</h3>
                <p className="text-[16px] font-normal text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Personalized assessment</p>
              </div>
              
              <div className="space-y-8">
                <p className="text-[15px] font-normal text-[#101828] whitespace-nowrap" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>
                  {latestBand != null
                    ? `You have reached an overall band of ${latestBand}${
                        rawChange != null && parseFloat(rawChange) !== 0
                          ? `, showing ${parseFloat(rawChange) > 0 ? 'an improvement' : 'a change'} of ${parseFloat(rawChange) > 0 ? '+' : ''}${rawChange} since your first attempt.`
                          : '.'
                      } Keep applying the feedback to maintain this momentum.`
                    : 'Complete your first exam to receive a personalized assessment.'}
                </p>

                {rawChange != null && Math.abs(parseFloat(rawChange)) < 0.5 && overallScores.length >= 3 && (
                  <div className="bg-[#FFF9F2] border border-[#FFE4BA] rounded-[12px] px-5 py-4">
                     <p className="text-[16.5px] leading-relaxed text-[#101828] font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>
                       <span className="text-[#DC6803] font-bold">Tutor Notice (Plateau):</span> Your score has been relatively stable across recent attempts. Focus on your highest priority Fix Cards to break through.
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
                   <p className="text-[22px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>+0.4</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-[16px] p-8 shadow-sm flex flex-col justify-center space-y-2 h-[110px]">
                   <p className="text-[13px] text-[#98A2B3] font-bold uppercase tracking-widest" style={{ fontFamily: "'Nunito', sans-serif" }}>Lowest Hanging Fruit</p>
                   <p className="text-[20px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Grammatical Range & Accuracy</p>
                </div>
              </div>
            </div>
          </div>
        : activeTab === "Fix Cards" ?
          <div className="space-y-8">
            {/* Fix Cards-Priority Errors — from real API data */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-5 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Fix Cards — Priority Errors</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Your most frequent error patterns across all submissions.</p>
               </div>
               <div className="p-8 space-y-4">
                 {sortedErrors.length === 0 ? (
                   <p className="text-[14px] text-gray-400 text-center py-8">Complete more exams to generate your Fix Cards.</p>
                 ) : sortedErrors.map((e, idx) => {
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
                <p className="text-[16px] font-medium text-[#101828]">Coherence & cohesion</p>
              </div>
              <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-[12px] p-6">
                <span className="text-[14px] font-bold text-[#EA4335] block mb-2">Primary Bottleneck</span>
                <p className="text-[16px] font-medium text-[#101828]">Grammatical range & accuracy</p>
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
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Focus on the top 2 error targets for 7 days; Repetition of basic lexis, Imprecise word choice.</p>
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

export default ReportsOverview;
