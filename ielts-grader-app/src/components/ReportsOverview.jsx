import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGET_BAND } from '../constants/ieltsBands';
import { formatGoalGap, goalStatusText } from '../utils/goalProgress';
import { BarChart3, ChevronDown, TrendingUp, Search, Calendar, FileText, ClipboardList, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardKpiStrip from '../dashboard/DashboardKpiStrip';
import SkillGrowth from './SkillGrowth';

const TASK_OPTIONS = ['Academic Task 1', 'Academic Task 2', 'General Task 1', 'General Task 2'];

const cardClass = 'bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden';

const ScoreBadge = ({ score }) => {
  const s = parseFloat(score);
  const color = s >= 7 ? '#30C3A9' : s >= 6 ? '#F59E0B' : '#EF4444';
  return (
    <div
      className="w-[52px] h-[26px] flex items-center justify-center rounded-full text-[13px] font-bold border leading-none shrink-0"
      style={{ backgroundColor: color + '1A', color, borderColor: color }}
    >
      {isNaN(s) ? '—' : s.toFixed(1)}
    </div>
  );
};

const ReportsOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const targetBand = parseFloat(user?.target_band) || DEFAULT_TARGET_BAND;
  const [activeTask, setActiveTask] = useState('Academic Task 1');
  const [submissions, setSubmissions] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(null);
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

  const filteredSubmissions = submissions.filter((sub) => {
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
    }
    if (dateFilter === 'Last 7 Days') {
      return diffDays <= 7;
    }
    if (dateFilter === 'Last 30 Days') {
      return diffDays <= 30;
    }
    return true;
  });

  useEffect(() => {
    setSubmissions([]);
    setAnalyticsData(null);
    setLoadingSubmissions(true);
    setLoadingAnalytics(true);

    api.getSubmissions({ taskType: activeTask })
      .then((res) => setSubmissions(res.data || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoadingSubmissions(false));

    api.getDashboardAnalytics({ taskType: activeTask })
      .then((d) => setAnalyticsData(d))
      .catch(() => setAnalyticsData({ chartData: [], frequentErrors: [] }))
      .finally(() => setLoadingAnalytics(false));
  }, [activeTask]);

  const handleOpenReport = async (submission) => {
    if (submission.status !== 'graded') return;
    setLoadingReport(submission.id);
    try {
      const report = await api.getReport(submission.id);
      navigate('/report', {
        state: {
          reportData: { ...report, examType: submission.exam_type, taskType: submission.task_type },
        },
      });
    } catch {
      navigate('/reports');
    } finally {
      setLoadingReport(null);
    }
  };

  const liveChartData = analyticsData?.chartData || [];
  const overallScores = liveChartData.map((d) => d.overall).filter(Boolean);
  const latestBand = overallScores[overallScores.length - 1] ?? null;
  const bestBand = overallScores.length ? Math.max(...overallScores).toFixed(1) : null;
  const gradedSubs = submissions.filter((s) => s.status === 'graded');
  const examCount = gradedSubs.length;
  const isLoading = loadingAnalytics || loadingSubmissions;

  const performanceSubtitle = useMemo(() => {
    if (isLoading) return 'Loading your performance data…';
    if (examCount === 0) {
      return 'Complete your first exam for this task to start tracking progress.';
    }
    if (latestBand != null) {
      const gap = formatGoalGap(latestBand, targetBand);
      if (gap === 'Target Reached') {
        return `You've reached your target of Band ${targetBand.toFixed(1)} across ${examCount} attempt${examCount === 1 ? '' : 's'}.`;
      }
      return `${examCount} attempt${examCount === 1 ? '' : 's'} recorded · ${gap} to your goal of Band ${targetBand.toFixed(1)}.`;
    }
    return goalStatusText(latestBand, targetBand);
  }, [isLoading, examCount, latestBand, targetBand]);

  return (
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
        <div className="relative z-10 px-4 md:px-6 pt-6 md:pt-10 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[12px] font-bold text-[#1A96F3] uppercase tracking-widest mb-2">Performance</p>
              <h1 className="text-[28px] md:text-[32px] font-bold text-[#101828] tracking-tight mb-2">
                {activeTask}
              </h1>
              <p className="text-[#667085] font-medium text-sm md:text-[15px] max-w-xl leading-relaxed">
                {performanceSubtitle}
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/performance?task=${encodeURIComponent(activeTask)}`)}
              className="bg-[#2C3E50] text-white w-full lg:w-auto px-6 h-[48px] rounded-[14px] text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#1D2939] transition-all shadow-sm shrink-0"
            >
              <BarChart3 size={18} />
              View detailed analysis
            </motion.button>
          </div>

          <DashboardKpiStrip
            latestBand={latestBand}
            targetBand={targetBand}
            thirdLabel="Attempts"
            thirdValue={examCount}
            fourthLabel="Best Band"
            fourthValue={bestBand ?? '—'}
            loading={isLoading}
          />

          {/* Task tabs */}
          <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar mt-6 md:mt-8">
            {TASK_OPTIONS.map((task) => (
              <div
                key={task}
                className="relative py-4 cursor-pointer group whitespace-nowrap"
                onClick={() => setActiveTask(task)}
              >
                <span
                  className={`text-[13px] font-semibold transition-colors ${
                    activeTask === task ? 'text-[#101828]' : 'text-[#475467] group-hover:text-[#101828]'
                  }`}
                >
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
        </div>
      </div>

      {/* Main canvas */}
      <div className="px-4 md:px-6 py-6 md:py-8">
        <div className="bg-[#F4F6F8] rounded-[24px] border border-[#E5E7EB]/80 p-4 md:p-6 flex flex-col gap-6">
          <SkillGrowth
            hasData={overallScores.length > 0}
            controlledTask={activeTask}
            hideTaskSelector
            isLoading={loadingAnalytics}
            targetBand={targetBand}
          />

          {/* Exam history card */}
          <div className={cardClass}>
            <div className="px-6 md:px-8 pt-6 pb-4 border-b border-[#F2F4F7]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
                    <ClipboardList size={18} />
                  </div>
                  <h2 className="text-[17px] font-bold text-[#101828]">Exam History</h2>
                  <span className="text-[11px] font-bold text-[#667085] bg-[#F2F4F7] px-2.5 py-1 rounded-full">
                    {filteredSubmissions.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3] group-focus-within:text-[#1A96F3] transition-colors"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search essays…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 h-[44px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[12px] text-[14px] focus:outline-none focus:border-[#1A96F3] focus:ring-2 focus:ring-[#1A96F3]/10 transition-all placeholder:text-[#98A2B3]"
                  />
                </div>
                <div className="relative z-30" ref={dateDropdownRef}>
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={18} />
                  <button
                    type="button"
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                    className="w-full md:w-[200px] pl-11 pr-10 h-[44px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[12px] text-[14px] text-left focus:outline-none focus:border-[#1A96F3] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[#101828] font-medium">{dateFilter}</span>
                    <ChevronDown className="text-[#98A2B3]" size={18} />
                  </button>
                  {showDateDropdown && (
                    <div className="absolute right-0 mt-2 w-full md:w-[200px] bg-white border border-[#E5E7EB] rounded-[12px] shadow-lg py-1 z-50">
                      {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setDateFilter(option);
                            setShowDateDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors hover:bg-[#F8FAFC] ${
                            dateFilter === option ? 'text-[#1A96F3] font-bold bg-[#EFF8FF]/50' : 'text-[#344054]'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 md:pt-3 space-y-2">
              {loadingSubmissions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-[#F2F4F7] rounded-[14px] p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F2F4F7] rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-[#F2F4F7] rounded w-36" />
                          <div className="h-3 bg-[#F2F4F7] rounded w-24" />
                        </div>
                        <div className="h-7 w-14 bg-[#F2F4F7] rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : submissions.length === 0 ? (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-center gap-4 py-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
                    <FileText size={28} strokeWidth={1.75} />
                  </div>
                  <div className="max-w-sm px-4">
                    <p className="text-[15px] font-bold text-[#101828] mb-1">No submissions yet</p>
                    <p className="text-[13px] text-[#667085] leading-relaxed">
                      Complete an exam for {activeTask} to see your reports here.
                    </p>
                  </div>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="min-h-[160px] flex flex-col items-center justify-center text-center gap-3 py-10">
                  <FileText size={32} className="text-[#D0D5DD]" />
                  <p className="text-[14px] font-medium text-[#667085]">No submissions match your filters.</p>
                </div>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const score = sub.overall_band;
                  const dateStr = new Date(sub.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const label = `${sub.exam_type} ${sub.task_type}`;
                  const isRowLoading = loadingReport === sub.id;
                  const isGraded = sub.status === 'graded';

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      onClick={() => handleOpenReport(sub)}
                      className={`border border-[#E5E7EB] rounded-[14px] p-4 flex items-center justify-between gap-3 transition-all ${
                        isGraded
                          ? 'cursor-pointer hover:border-[#B2DDFF] hover:bg-[#F8FAFC] hover:shadow-sm'
                          : 'cursor-default opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[#EFF8FF] text-[#1A96F3] rounded-xl flex items-center justify-center shrink-0 border border-[#B2DDFF]/60">
                          <TrendingUp size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] md:text-[15px] font-bold text-[#101828] truncate">{label}</h4>
                          <p className="text-[12px] text-[#667085] font-medium mt-0.5">{dateStr}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <span className="hidden md:inline-flex px-3 py-1 bg-[#F2F4F7] text-[#667085] rounded-full text-[11px] font-bold uppercase tracking-wider">
                          {sub.status === 'grading' ? 'Grading…' : sub.status === 'failed' ? 'Failed' : sub.word_count ? `${sub.word_count}w` : sub.task_type}
                        </span>
                        {isRowLoading ? (
                          <span className="text-[13px] font-bold text-[#667085] w-[52px] text-center">…</span>
                        ) : score ? (
                          <ScoreBadge score={score} />
                        ) : (
                          <span className="text-[13px] font-bold text-[#98A2B3]">—</span>
                        )}
                        <ChevronRight size={18} className="text-[#D0D5DD] hidden md:block" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsOverview;
