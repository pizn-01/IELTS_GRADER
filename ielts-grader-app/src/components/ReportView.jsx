import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText, Download, Eye, ArrowLeft, CheckCircle, XCircle, AlertTriangle, TrendingDown, TrendingUp, X, Bell, User, Shield, CircleDollarSign, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TargetBandPrompt from './TargetBandPrompt';
import ReportUpgradeCta from './ReportUpgradeCta';
import { FREE_TRIAL_CREDITS } from '../constants/subscriptionPlans';
import {
  hasSeenFirstReportTabChips,
  markFirstReportTabChipsSeen,
} from '../utils/reportDiscoveryStorage';

function resolveTaskVariant(examType, taskType) {
  if (taskType === 'Task 1') {
    return examType === 'General' ? 'task1-letter' : 'task1-report';
  }
  return 'task2';
}

function getTabsForVariant(variant) {
  const base = ['Overview', 'Error Analysis', 'Dual Assessment', 'Model Answer', 'Vocabulary', 'Grammar'];
  if (variant === 'task2') return [...base, 'Argumentation', 'Flow & Logic'];
  if (variant === 'task1-report') return [...base, 'Data Structure', 'Flow & Logic'];
  if (variant === 'task1-letter') return [...base, 'Structure', 'Flow & Logic'];
  return [...base, 'Flow & Logic'];
}

const StarRating = ({ count = 0 }) => (
  <span className="text-[#F59E0B] text-[14px] tracking-tight">
    {'★'.repeat(Math.min(5, Math.max(0, count)))}
    <span className="text-gray-200">{'★'.repeat(Math.max(0, 5 - count))}</span>
  </span>
);

const BulletList = ({ items, colorClass = 'text-[#101828]' }) => {
  if (!items?.length) return null;
  return (
    <ul className="space-y-4">
      {items.map((text, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-[7px] shrink-0" />
          <span className={`text-[14px] font-semibold leading-relaxed ${colorClass}`}>{text}</span>
        </li>
      ))}
    </ul>
  );
};

const EmptyTabState = ({ title, message }) => (
  <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
        <FileText className="text-gray-300" />
      </div>
      <h3 className="text-[18px] font-bold text-[#101828]">{title}</h3>
      <p className="text-gray-400 text-[14px]">{message}</p>
    </div>
  </div>
);

const AuthenticityList = ({ title, list, textKey, fixKey }) => {
  if (!list?.length) return null;
  return (
    <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden p-4 md:p-6">
      <h4 className="text-[15px] font-bold text-[#101828] mb-4">{title}</h4>
      <ul className="space-y-4">
        {list.map((item, i) => (
          <li key={i} className="text-[14px] leading-relaxed">
            <span className="line-through text-[#EA4335] font-semibold">{item[textKey]}</span>
            <div className="mt-1">
              <span className="text-[#00C9B1] font-bold text-[12px] uppercase">Try: </span>
              <span className="text-[#101828] font-medium">{item[fixKey]}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const CollapsibleCard = ({ title, sectionKey, expanded, onToggle, children, defaultOpen = true }) => {
  const isOpen = expanded === undefined ? defaultOpen : expanded;
  return (
    <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
      <div
        className="px-4 md:px-8 py-4 md:py-5 border-b border-[#D1D5DB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => onToggle(sectionKey)}
      >
        <h3 className="text-[16px] font-bold text-[#101828]">{title}</h3>
        <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="px-4 md:px-8 py-4 md:py-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

// Official IELTS criteria order — matches the grader error taxonomy hierarchy
// (Task Response / Task Achievement → Coherence & Cohesion → Lexical Resource → GRA).
const TAXONOMY_CRITERIA_ORDER = [
  'Task Response',
  'Task Achievement',
  'Coherence & Cohesion',
  'Lexical Resource',
  'Grammatical Range & Accuracy',
];

const SEVERITY_ORDER = ['Major', 'High', 'Medium', 'Low'];

const severityBadgeClass = (severity) => {
  if (severity === 'Major') return 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]';
  if (severity === 'High') return 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]';
  if (severity === 'Medium') return 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]';
  return 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]';
};

/** Group errors by a taxonomy field, preserving a stable display order. */
function groupErrorsBy(errors, key, orderList) {
  const map = {};
  errors.forEach((e) => {
    const k = e[key] || 'General';
    if (!map[k]) map[k] = [];
    map[k].push(e);
  });
  const keys = Object.keys(map);
  keys.sort((a, b) => {
    const ia = orderList.indexOf(a);
    const ib = orderList.indexOf(b);
    if (ia === -1 && ib === -1) {
      const diff = map[b].length - map[a].length;
      return diff !== 0 ? diff : a.localeCompare(b);
    }
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return keys.map((k) => ({ key: k, errors: map[k] }));
}

function ErrorCard({ error, index }) {
  const criteria = error.criteria || 'N/A';
  const sub = error.sub_category || 'General';
  return (
    <div className="border-b border-[#F2F4F7] last:border-0 px-4 md:px-6 py-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12px] font-bold text-[#9CA3AF]">#{index}</span>
        <span className="text-[14px] font-bold text-[#101828]">{error.title || 'Error'}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${severityBadgeClass(error.severity)}`}>
          {error.severity || 'Medium'}
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
          {criteria} → {sub}
        </span>
        {error.location_text && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#166534] border border-[#D1FAE5]">
            {error.location_text}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-[#FEF2F2] rounded-[10px] p-4">
          <p className="text-[11px] font-bold text-[#DC2626] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle size={12} /> Original
          </p>
          <p className="text-[13px] text-[#7F1D1D] font-medium leading-relaxed italic">
            "{error.original_text}"
          </p>
        </div>
        <div className="bg-[#F0FDF4] rounded-[10px] p-4">
          <p className="text-[11px] font-bold text-[#16A34A] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle size={12} /> Correction
          </p>
          <p className="text-[13px] text-[#14532D] font-medium leading-relaxed">
            {error.correction_text}
          </p>
        </div>
      </div>
      {error.explanation && (
        <p className="text-[13px] text-[#475467] leading-relaxed">
          <span className="font-semibold text-[#101828]">{error.title || 'Error'}: </span>
          {error.explanation}
        </p>
      )}
    </div>
  );
}

const ReportView = ({
  onBack,
  data,
  showHeader = false,
  showUpgradeCta = false,
  showTabDiscovery = false,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  // Capture once on mount so marking "seen" does not hide chips mid-visit.
  const [showTabChips] = useState(
    () => showTabDiscovery && !hasSeenFirstReportTabChips()
  );
  const [expandedSections, setExpandedSections] = useState({
    taskResponse: true,
    errorAnalysis: true,
    dualAssessment: [0, 1], // Indices of expanded sections
    vocabulary: [0], // Indices of expanded sections
    trendVerbs: true,
    introAnalysis: true,
    dataCoverageMap: true,
    flowParagraph: true,
    logicalIssues: true,
    paragraphUnity: false,
    sentenceFlow: false,
    cohesiveDevices: false
  });

  const toggleSection = (section, index = null) => {
    setExpandedSections(prev => {
      if (index === null) {
        return { ...prev, [section]: !prev[section] };
      }
      const current = prev[section] || [];
      const next = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
      return { ...prev, [section]: next };
    });
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Error Analysis detailed-corrections grouping — mirrors examinee ground truth
  // toggles: By Criteria | By Sub-Category | By Severity (taxonomy hierarchy).
  const [errorGroupBy, setErrorGroupBy] = useState('criteria');
  const profileRef = useRef(null);

  const { user } = useAuth();
  const [showTargetPrompt, setShowTargetPrompt] = useState(false);
  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const userName = user?.full_name || 'User';
  const userEmail = user?.email || '';
  const creditsRem = user?.credits_remaining ?? 0;
  const creditsMax = Math.max(user?.credits_allowance ?? FREE_TRIAL_CREDITS, 1);
  const creditsOffset = (75.4 * (1 - Math.min(creditsRem, creditsMax) / creditsMax)).toFixed(2);
  const reportDate = data?.created_at
    ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleOpenSidebar = () => setIsSidebarOpen(true);
    document.addEventListener('open-exam-sidebar', handleOpenSidebar);
    return () => document.removeEventListener('open-exam-sidebar', handleOpenSidebar);
  }, []);

  useEffect(() => {
    // Explicit !== true so missing/undefined still prompts (same as Performance CTA).
    if (!user || user.target_band_confirmed === true) return;
    const band = data?.overall_band ?? data?.overallBand;
    if (band == null || Number.isNaN(parseFloat(band))) return;
    setShowTargetPrompt(true);
  }, [user, data?.overall_band, data?.overallBand]);

  // Use provided data or fallback to defaults
  const essayContent = data?.essay || "Some people argue that imposing longer prison sentences is the most effective way to reduce crime, while others believe that alternative measures can achieve better results. Although stricter punishments may deter certain offenders, I believe that addressing the root causes of crime is a more sustainable and effective solution.";
  const taskTitle = data ? `${data.exam_type || data.examType || ''} ${data.task_type || data.taskType || ''}`.trim() : "Task 2- Academic";
  const taskQuestion = data?.taskQuestion || "Task : Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.";

  const taskVariant = useMemo(
    () => data?.task_variant || resolveTaskVariant(data?.exam_type || data?.examType, data?.task_type || data?.taskType),
    [data]
  );
  const reportTabs = useMemo(() => getTabsForVariant(taskVariant), [taskVariant]);

  useEffect(() => {
    if (!reportTabs.includes(activeTab)) {
      setActiveTab('Overview');
    }
  }, [reportTabs, activeTab]);

  useEffect(() => {
    if (!showTabDiscovery || !showTabChips) return;
    markFirstReportTabChipsSeen();
  }, [showTabDiscovery, showTabChips]);

  const isSubscribed =
    user?.subscription_status === 'active' || user?.is_subscribed === true;
  const showInlineUpgrade = showUpgradeCta && user && !isSubscribed;

  return (
    <div className="min-h-screen bg-white font-sans relative">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white z-[111] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 h-[72px] flex items-center justify-between border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-[#101828]">{taskTitle}</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-[#101828] transition-colors">
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Task Question Box */}
          <div className="bg-[#F8FAFC] border border-[#10182808] rounded-[12px] p-5">
            <p className="text-[13px] text-[#101828] leading-[1.6] font-bold">
              {taskQuestion}
            </p>
          </div>

          {/* Essay Content */}
          <div className="space-y-6">
            <p className="text-[13px] text-[#475467] leading-[1.8] font-normal whitespace-pre-wrap">
              {essayContent}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-50 flex justify-end">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-[110px] h-[44px] bg-[#344054] text-white rounded-[8px] text-[13px] font-semibold hover:bg-[#1D2939] transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
      {/* SECTION 1 — NAVBAR (NO gradient, pure white) */}
      {showHeader && (
        <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 z-[100] h-[56px] flex items-center px-4 md:px-[40px]">
          <div className="w-full max-w-[1340px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-[18px] md:text-[20px] tracking-tight text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>IELTSGRADER</div>
              <div className="hidden md:block h-6 w-px bg-[#E5E7EB]"></div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8 text-[14px] text-[#101828] font-sans h-[56px]">
                <div className="relative h-full flex items-center cursor-pointer text-gray-400 hover:text-gray-600 transition-colors" onClick={onBack}>
                  Dashboard
                </div>
                <div className="relative h-full flex items-center cursor-pointer text-[#101828] font-bold">
                  Reports
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#3B82F6] rounded-t-full"></div>
                </div>
                <div className="relative h-full flex items-center cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                  Settings
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Credits Pill — desktop only */}
              <div className="hidden md:flex bg-[#DDF2FF] rounded-full px-4 py-1.5 items-center gap-3 text-left">
                <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="14" cy="14" r="12" stroke="#C7E3F9" strokeWidth="2.5" fill="transparent" />
                    <circle cx="14" cy="14" r="12" stroke="#1A96F3" strokeWidth="2.5" strokeDasharray="75.4" strokeDashoffset={creditsOffset} strokeLinecap="round" fill="transparent" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[12px] font-semibold text-[#101828]">Free Trial</span>
                  <span className="text-[12px] font-bold text-[#101828]">Credits: {creditsRem}/{creditsMax} Remaining</span>
                </div>
              </div>

              <button className="hidden md:block text-[#94A3B8] hover:text-[#64748B] transition-colors">
                <Bell size={22} fill="currentColor" />
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 bg-[#0F172A] text-white rounded-[12px] flex items-center justify-center text-[14px] font-bold shadow-sm overflow-hidden hover:opacity-90 transition-all leading-none"
                >
                  <span className="translate-y-[0.5px]">{userInitials}</span>
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-[20px] border border-gray-100 shadow-xl z-[100] py-2 animate-in fade-in zoom-in duration-200 origin-top-right text-left">
                    {/* Arrow */}
                    <div className="absolute -top-[6px] right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45"></div>

                    {/* User Info Section */}
                    <div className="px-6 py-5 flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#2C3E50] rounded-full flex items-center justify-center text-white text-[18px] font-bold overflow-hidden shrink-0 leading-none">
                        <span className="translate-y-[1px]">{userInitials}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[16px] font-bold text-[#101828] truncate">{userName}</span>
                        <span className="text-[14px] text-gray-400 truncate">{userEmail}</span>
                      </div>
                    </div>

                    <div className="h-px bg-gray-50 mx-4 mb-2"></div>

                    {/* Nav Items */}
                    <div className="px-3 space-y-1">
                      {[
                        { label: 'Profile', icon: <User size={18} /> },
                        { label: 'Security', icon: <Shield size={18} /> },
                        { label: 'Subscription', icon: <CircleDollarSign size={18} /> },
                        { label: 'Support', icon: <HelpCircle size={18} /> },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[#101828] hover:bg-gray-50 rounded-xl transition-colors group"
                        >
                          <span className="text-gray-400 group-hover:text-[#101828] transition-colors">{item.icon}</span>
                          <span className="text-[14px] font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="h-px bg-gray-50 mx-4 my-2"></div>

                    {/* Sign Out Section */}
                    <div className="px-3">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-[#1A96F3] hover:bg-blue-50 rounded-xl transition-colors group"
                      >
                        <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[14px] font-bold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* SECTION 2 — REPORT HEADER (gradient here ONLY) */}
      <div className="relative z-10 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #E0F2FE 20%, #FBCFE8 50%, #E0F2FE 80%)'
      }}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-12 relative z-20">
          <div className="flex items-center justify-between mb-[6px] gap-3">
            {/* Title Row */}
            <div className="flex items-center gap-[10px] min-w-0">
              <button
                onClick={onBack}
                className="w-[24px] h-[24px] border-[2px] border-[#101828] rounded-full flex items-center justify-center shrink-0 hover:bg-[#10182810] transition-all"
              >
                <ArrowLeft size={12} strokeWidth={3} className="text-[#101828]" />
              </button>
              <div className="flex items-center flex-wrap gap-x-1 min-w-0">
                <h1 className="text-[15px] md:text-[20px] font-bold text-[#101828] leading-none truncate">{taskTitle}</h1>
                <span className="text-[#101828] opacity-30 font-normal mx-1 text-[15px] md:text-[20px] leading-none hidden sm:inline">·</span>
                <h1 className="text-[13px] md:text-[20px] font-semibold md:font-bold text-[#101828] opacity-70 md:opacity-100 leading-none hidden sm:block">{reportDate}</h1>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-[8px] md:gap-[12px] shrink-0">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="bg-transparent border border-[#1018281A] rounded-[8px] px-[10px] md:px-[18px] py-[6px] md:py-[8px] text-[12px] md:text-[14px] font-medium text-[#101828] hover:bg-white/10 transition-all whitespace-nowrap"
              >
                View Exam
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#1a1f36] text-white rounded-[8px] px-[10px] md:px-[18px] py-[6px] md:py-[8px] text-[12px] md:text-[14px] font-semibold hover:bg-[#2d3a4a] transition-all border-none whitespace-nowrap"
              >
                Export
              </button>
            </div>
          </div>

          {/* Subtitle Row */}
          <div className="mb-[16px] flex items-center gap-1">
            <span className="text-[13px] font-semibold text-[#101828]">Overall Band Score</span>
            <span className="text-[13px] font-semibold text-[#101828]">{data?.overall_band ?? '—'}</span>
          </div>

          {/* Tab Bar Navigation */}
          <div className="flex items-center gap-[20px] md:gap-[28px] border-b border-[#D1D5DB66] overflow-x-auto no-scrollbar">
            {reportTabs.map((tab) => (
              <div
                key={tab}
                className="relative pb-[12px] cursor-pointer group whitespace-nowrap shrink-0"
                onClick={() => setActiveTab(tab)}
              >
                <span className={`text-[13px] md:text-[14px] transition-all ${activeTab === tab ? "text-[#101828] font-bold" : "text-[#101828] font-semibold hover:text-[#000000]"}`}>
                  {tab}
                </span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B82F6]"></div>
                )}
              </div>
            ))}
          </div>

          {showTabChips && (
            <div className="pt-3 pb-1">
              <p className="text-[12px] font-semibold text-[#667085] mb-2">
                Your full report includes:
              </p>
              <div className="flex flex-wrap gap-2">
                {reportTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      activeTab === tab
                        ? 'bg-[#2C3E50] text-white border-transparent'
                        : 'bg-white/70 text-[#344054] border-[#D1D5DB] hover:border-[#1A96F3] hover:text-[#1A96F3]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3 — PAGE CONTENT (white) */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-[32px] bg-white">
        {activeTab === "Overview" ? (
          <div className="space-y-6">
              <div className="space-y-6">
                <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 md:px-10 py-5 md:py-6 border-b border-gray-100">
                    <h3 className="text-[16px] font-bold text-[#101828]">Criteria Breakdown</h3>
                  </div>
                  <div className="py-8 md:py-14 px-4 md:px-12 flex flex-col md:flex-row items-center gap-8 md:gap-[216px]">
                    <div className="shrink-0 md:pl-4">
                      <div className="flex flex-col items-center">
                        <div className="relative w-[120px] h-[120px] md:w-[140px] md:h-[140px] flex items-center justify-center">
                          <svg viewBox="0 0 130 130" className="w-full h-full transform -rotate-90">
                            <circle cx="65" cy="65" r="58" stroke="#F0F7FF" strokeWidth="10" fill="transparent" />
                            <circle cx="65" cy="65" r="58" stroke="#1A96F3" strokeWidth="10" fill="transparent" strokeDasharray="364.42" strokeDashoffset={data?.overall_band != null ? 364.42 * (1 - (parseFloat(data.overall_band) / 9)) : 364.42} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-[38px] md:text-[44px] font-bold text-[#1A96F3] tracking-tight">{data?.overall_band ?? '—'}</span></div>
                        </div>
                        <span className="text-[13px] md:text-[14px] font-bold text-[#101828] mt-3 md:mt-4">Overall Band Score</span>
                      </div>
                    </div>
                    <div className="w-full md:flex-1 space-y-4 md:space-y-6 md:pl-8 md:pr-12">
                      {[
                        { label: "Task Response", score: data?.response_band },
                        { label: "Coherence & Cohesion", score: data?.coherence_band },
                        { label: "Lexical Resource", score: data?.vocabulary_band },
                        { label: "Grammatical Range & Accuracy", score: data?.grammar_band },
                      ].map((item, idx) => {
                        const val = item.score != null ? parseFloat(item.score) : null;
                        const color = val == null ? "#D1D5DB" : val >= 7 ? "#00C9B1" : val >= 5.5 ? "#FF9F00" : "#EF4444";
                        return (
                        <div key={idx} className="flex items-center gap-3 w-full">
                          <span className="text-[12px] md:text-[14px] text-[#101828] font-bold shrink-0 w-[110px] md:w-auto">{item.label}</span>
                          <div className="flex items-center gap-2 md:gap-4 flex-1">
                            <span className="text-[13px] md:text-[14px] text-[#101828] font-normal w-7 md:w-8 text-right shrink-0">{val ?? '—'}</span>
                            <div className="h-[8px] md:h-[10px] flex-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{ width: val != null ? `${((val - 1) / 8) * 100}%` : '0%', backgroundColor: color }}></div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 md:px-10 py-5 md:py-6 border-b border-gray-100">
                    <h3 className="text-[16px] font-bold text-[#101828]">Scoring Details</h3>
                    <p className="text-[13px] text-[#101828] opacity-60 mt-1">Base, ceiling, and penalty breakdown</p>
                  </div>
                  <div className="overflow-x-auto">
                  <div className="p-4 md:p-10 space-y-4 md:space-y-6 min-w-[600px]">
                    <div className="bg-[#F3F4F6] rounded-[14px] px-4 md:px-8 py-5 grid grid-cols-[2fr,repeat(7,1fr)] text-[13px] font-medium">
                      <div className="text-left text-[#101828]">Criterion</div>
                      <div className="text-center text-[#101828]">Base</div>
                      <div className="text-center text-[#101828]">Ceiling</div>
                      <div className="text-center text-[#8B5CF6]">Final</div>
                      <div className="text-center text-[#EF4444]">Major</div>
                      <div className="text-center text-[#F59E0B]">High</div>
                      <div className="text-center text-[#3B82F6]">Med</div>
                      <div className="text-center text-[#101828]">Low</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {(() => {
                        const errs = data?.errors || [];
                        const fmtCount = (n) => n > 0 ? n : '-';
                        return [
                          { name: "Task Response", band: data?.response_band, key: "Task Response" },
                          { name: "Coherence & Cohesion", band: data?.coherence_band, key: "Coherence & Cohesion" },
                          { name: "Lexical Resource", band: data?.vocabulary_band, key: "Lexical Resource" },
                          { name: "Grammatical Range & Accuracy", band: data?.grammar_band, key: "Grammatical Range & Accuracy" },
                        ].map((row, i) => {
                          const b = row.band != null ? parseFloat(row.band) : null;
                          const final = b != null ? b.toFixed(1) : '—';
                          const color = b == null ? '#9CA3AF' : b >= 7 ? '#10B981' : b >= 5.5 ? '#F59E0B' : '#EF4444';
                          const critErrs = errs.filter(e => e.criteria === row.key);
                          const major = fmtCount(critErrs.filter(e => e.severity === 'Major').length);
                          const high  = fmtCount(critErrs.filter(e => e.severity === 'High').length);
                          const med   = fmtCount(critErrs.filter(e => e.severity === 'Medium').length);
                          const low   = fmtCount(critErrs.filter(e => e.severity === 'Low').length);
                          return (
                            <div key={i} className="px-8 py-3 grid grid-cols-[2fr,repeat(7,1fr)] items-center text-[14px] hover:bg-gray-50 transition-colors">
                              <div className="text-[#101828] font-medium whitespace-nowrap">{row.name}</div>
                              <div className="text-center text-[#101828] font-medium">{final}</div>
                              <div className="text-center text-[#101828] font-medium">{final}</div>
                              <div className="text-center font-medium" style={{ color }}>{final}</div>
                              <div className="text-center text-[#101828] font-medium">{major === '-' ? <span className="opacity-40">-</span> : major}</div>
                              <div className="text-center text-[#101828] font-medium">{high  === '-' ? <span className="opacity-40">-</span> : high}</div>
                              <div className="text-center text-[#101828] font-medium">{med   === '-' ? <span className="opacity-40">-</span> : med}</div>
                              <div className="text-center text-[#101828] font-medium">{low   === '-' ? <span className="opacity-40">-</span> : low}</div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100">
                      <h3 className="text-[16px] font-bold text-[#101828] mb-1">Strengths</h3>
                      <p className="text-[14px] text-gray-500">What you did well</p>
                    </div>
                    <div className="p-4 md:p-8"><ul className="space-y-4 md:space-y-5">{(data?.strengths || ["Clear introduction identifying chart type and subject", "Logical body structure organized by age group", "Effective use of cohesive devices and linking words", "Good paragraphing with unified topic focus"]).map((text, i) => (<li key={i} className="flex items-start gap-3 md:gap-4"><div className="mt-1 text-[#00C9B1] shrink-0"><TrendingUp size={18} /></div><span className="text-[13px] md:text-[14px] text-[#101828] font-medium leading-relaxed">{text}</span></li>))}</ul></div>
                  </div>
                  <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100">
                      <h3 className="text-[16px] font-bold text-[#101828] mb-1">Weaknesses</h3>
                      <p className="text-[14px] text-gray-500">Areas for improvement</p>
                    </div>
                    <div className="p-4 md:p-8"><ul className="space-y-4 md:space-y-5">{(data?.weaknesses || ["Data accuracy issues, numerical values don't match reference", "Coverage gaps, misses key features from the reference chart", "Limited sentence variety (predominantly simple/compound)", "Basic comparative phrasing rather than precise quantified comparisons"]).map((text, i) => (<li key={i} className="flex items-start gap-3 md:gap-4"><div className="mt-1 text-[#FF4D4D] shrink-0"><TrendingDown size={18} /></div><span className="text-[13px] md:text-[14px] text-[#101828] font-medium leading-relaxed">{text}</span></li>))}</ul></div>
                  </div>
                </div>

                {showInlineUpgrade && (
                  <ReportUpgradeCta creditsRemaining={creditsRem} />
                )}

                <div className="space-y-4">
                  {(() => {
                    const allErrors = data?.errors || [];
                    // The grader defines its own sub-category hierarchy per criterion
                    // (and it differs by exam/task type — e.g. Task 1 Report's Task
                    // Response has Data Accuracy/Coverage/Overview.../Comparison/
                    // Development/Relevance, while Task 2's has Coverage/Position/
                    // Development/Relevance/Conclusion). That hierarchy — with a
                    // performance summary and a short verbatim example per
                    // sub-category — already comes back from the grader as
                    // raw_grader_output.primary.sub_category_scores; this is the
                    // authoritative list of categories to show here, not individual
                    // error instances (which are just occurrences, not categories).
                    const subCategoryScores =
                      data?.raw_grader_output?.primary?.sub_category_scores
                      || data?.sub_category_scores
                      || {};
                    const sections = [
                      { id: "taskResponse",    title: "Task Response",                  band: data?.response_band,  key: "Task Response" },
                      { id: "coherenceCohesion", title: "Coherence & Cohesion",         band: data?.coherence_band, key: "Coherence & Cohesion" },
                      { id: "lexicalResource", title: "Lexical Resource",               band: data?.vocabulary_band,key: "Lexical Resource" },
                      { id: "grammaticalRange",title: "Grammatical Range & Accuracy",   band: data?.grammar_band,   key: "Grammatical Range & Accuracy" },
                    ];
                    return sections.map((section, idx) => {
                      const bandVal = section.band != null ? parseFloat(section.band) : null;
                      const bandStr = bandVal != null ? bandVal.toFixed(1) : '—';
                      const isExpanded = expandedSections[section.id];
                      const subRows = subCategoryScores[section.key] || [];
                      // Fallback for older reports graded before sub_category_scores
                      // existed: show raw error instances instead of an empty state.
                      const critErrors = subRows.length === 0 ? allErrors.filter(e => e.criteria === section.key).slice(0, 6) : [];
                      return (
                        <div key={idx} className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
                          <div
                            className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleSection(section.id)}
                          >
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              <span className="text-[14px] md:text-[16px] font-bold text-[#101828]">{section.title}</span>
                              <span className="inline-flex items-center justify-center bg-[#E6FFFA] text-[#00C9B1] border border-[#B2F5EA] text-[11px] md:text-[12px] font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase leading-none shrink-0">Band {bandStr}</span>
                            </div>
                            <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                              {subRows.length > 0 ? subRows.map((row, i) => {
                                const rb = row.band != null ? parseFloat(row.band) : null;
                                const rowColor = rb == null ? '#9CA3AF' : rb >= 7 ? '#00C9B1' : rb >= 5.5 ? '#F59E0B' : '#EF4444';
                                const rowStyle = rb == null ? "bg-gray-50 text-gray-400 border-gray-200" : rb >= 7 ? "bg-[#E6FFFA] text-[#00C9B1] border-[#B2F5EA]" : rb >= 5.5 ? "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]" : "bg-[#FFF5F5] text-[#EA4335] border-[#EA4335]";
                                return (
                                  <div key={i} className="px-4 md:px-8 py-4 md:py-5 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-2">
                                      <span className="text-[13px] md:text-[14px] font-bold text-[#101828]">{row.name}</span>
                                      <span className={`${rowStyle} inline-flex items-center justify-center border-[1px] text-[11px] md:text-[12px] font-medium px-2 md:px-2.5 py-0.5 rounded-full uppercase leading-none`} style={{ color: rowColor }}>Band {rb != null ? rb.toFixed(1) : '—'}</span>
                                    </div>
                                    {row.strength && (
                                      <p className="text-[12px] md:text-[13px] text-[#101828] leading-relaxed font-normal mb-1"><span className="font-semibold text-[#00C9B1]">Strength: </span>{row.strength}</p>
                                    )}
                                    {row.weakness && (
                                      <p className="text-[12px] md:text-[13px] text-[#101828] leading-relaxed font-normal mb-1"><span className="font-semibold text-[#EA4335]">Weakness: </span>{row.weakness}</p>
                                    )}
                                    {row.evidence && (
                                      <p className="text-[12px] md:text-[13px] text-gray-500 leading-relaxed font-normal italic mt-1">e.g. "{row.evidence}"</p>
                                    )}
                                  </div>
                                );
                              }) : critErrors.length === 0 ? (
                                <div className="px-4 md:px-8 py-4 md:py-5 text-[13px] text-gray-400">No errors detected in this category.</div>
                              ) : critErrors.map((err, i) => {
                                const sevStyle = err.severity === 'Major'
                                  ? "bg-[#FFF5F5] text-[#EA4335] border-[#EA4335]"
                                  : err.severity === 'High'
                                  ? "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]"
                                  : "bg-[#E6FFFA] text-[#00C9B1] border-[#00C9B1]";
                                return (
                                  <div key={i} className="px-4 md:px-8 py-4 md:py-5 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-2">
                                      <span className="text-[13px] md:text-[14px] font-normal text-[#101828]">{err.sub_category || err.title}</span>
                                      <span className={`${sevStyle} inline-flex items-center justify-center border-[1px] text-[11px] md:text-[12px] font-medium px-2 md:px-2.5 py-0.5 rounded-full uppercase leading-none`}>{err.severity}</span>
                                    </div>
                                    <p className="text-[12px] md:text-[13px] text-[#101828] leading-relaxed font-normal">{err.explanation}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
        ) : activeTab === "Error Analysis" ? (() => {
          // Taxonomy-driven layout (matches examinee ground truth):
          // 1) severity stats  2) distribution by official criteria
          // 3) error-type cards (taxonomy labels)  4) corrections grouped by
          //    Criteria / Sub-Category / Severity with Criteria → Sub-Category tags.
          const errors = data?.errors || [];
          const severityCounts = {
            Major: errors.filter((e) => e.severity === 'Major').length,
            High: errors.filter((e) => e.severity === 'High').length,
            Medium: errors.filter((e) => e.severity === 'Medium').length,
            Low: errors.filter((e) => e.severity === 'Low').length,
          };

          const byCriteria = groupErrorsBy(errors, 'criteria', TAXONOMY_CRITERIA_ORDER);
          const maxCriteria = Math.max(1, ...byCriteria.map((g) => g.errors.length));

          // Error-type breakdown: taxonomy error labels (title field from grader tags)
          const typeMap = {};
          errors.forEach((e) => {
            const label = e.title || 'Unknown';
            if (!typeMap[label]) typeMap[label] = { count: 0, sample: e, criteria: e.criteria, sub: e.sub_category };
            typeMap[label].count += 1;
          });
          const errorTypes = Object.entries(typeMap)
            .map(([label, info]) => ({ label, ...info }))
            .sort((a, b) => b.count - a.count);

          const groups =
            errorGroupBy === 'criteria'
              ? groupErrorsBy(errors, 'criteria', TAXONOMY_CRITERIA_ORDER)
              : errorGroupBy === 'sub_category'
              ? groupErrorsBy(errors, 'sub_category', [])
              : groupErrorsBy(errors, 'severity', SEVERITY_ORDER);

          const groupTitle = (key) =>
            errorGroupBy === 'severity' ? `${String(key).toUpperCase()} Severity` : key;

          return (
          <div className="space-y-8">
            {/* Severity stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4">
              {[
                { label: 'Total Errors', count: errors.length, color: 'text-[#00C9B1]' },
                { label: 'Major', count: severityCounts.Major, color: 'text-[#EA4335]' },
                { label: 'High', count: severityCounts.High, color: 'text-[#F59E0B]' },
                { label: 'Medium', count: severityCounts.Medium, color: 'text-[#1A96F3]' },
                { label: 'Low', count: severityCounts.Low, color: 'text-[#16A34A]' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-[16px] p-4 md:p-5 border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-[24px] md:text-[28px] font-black ${item.color}`}>{item.count}</p>
                </div>
              ))}
            </div>

            {/* Distribution by official criteria (taxonomy top level) */}
            <div className="bg-white rounded-[16px] p-4 md:p-8 border border-[#E5E7EB] shadow-sm">
              <h3 className="text-[15px] font-bold text-[#101828] mb-1">Error Distribution by Criteria</h3>
              <p className="text-[13px] text-gray-400 mb-5">Official IELTS criteria from the grader taxonomy</p>
              {byCriteria.length === 0 ? (
                <p className="text-[14px] text-gray-400">No errors detected.</p>
              ) : (
                <div className="space-y-4">
                  {byCriteria.map(({ key, errors: group }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-[12px] md:text-[13px] font-medium text-[#475467] w-[120px] md:w-[220px] shrink-0">{key}</span>
                      <span className="text-[13px] font-bold text-[#101828] w-6">{group.length}</span>
                      <div className="h-[10px] flex-1 bg-[#F2F4F7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1A96F3] rounded-full"
                          style={{ width: `${(group.length / maxCriteria) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error type breakdown (taxonomy tags / error labels) */}
            <div className="bg-white rounded-[16px] p-4 md:p-8 border border-[#E5E7EB] shadow-sm">
              <h3 className="text-[15px] font-bold text-[#101828] mb-1">Error Type Breakdown</h3>
              <p className="text-[13px] text-gray-400 mb-5">Specific taxonomy error types detected in your writing</p>
              {errorTypes.length === 0 ? (
                <p className="text-[14px] text-gray-400">No specific error types detected.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {errorTypes.map((t) => (
                    <div
                      key={t.label}
                      className="rounded-[12px] border border-[#E5E7EB] p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-[#F2F4F7]">
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[#101828] truncate">{t.label}</p>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                            {(t.criteria || '—')} → {(t.sub || '—')}
                          </p>
                        </div>
                        <span className="shrink-0 bg-[#F1F5F9] text-[#475569] text-[12px] font-bold px-3 py-1 rounded-full">
                          {t.count}×
                        </span>
                      </div>
                      <p className="text-[12px] text-[#64748B] leading-relaxed line-clamp-3">
                        {t.sample?.explanation || 'No description available'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed corrections — taxonomy-grouped views */}
            <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-4 md:px-8 py-4 md:py-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold text-[#101828]">All Corrections</h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">Grouped by the grader error taxonomy</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'criteria', label: 'By Criteria' },
                    { id: 'sub_category', label: 'By Sub-Category' },
                    { id: 'severity', label: 'By Severity' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setErrorGroupBy(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                        errorGroupBy === opt.id
                          ? 'bg-[#1A96F3] text-white'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {errors.length === 0 ? (
                <p className="text-[14px] text-gray-400 text-center py-10">No errors detected in this submission.</p>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {groups.map(({ key, errors: group }) => (
                    <div key={key}>
                      <div className="px-4 md:px-8 py-3 md:py-4 bg-[#F9FAFB] flex items-center justify-between">
                        <h4 className="text-[14px] md:text-[15px] font-bold text-[#101828]">{groupTitle(key)}</h4>
                        <span className="text-[12px] font-bold text-[#64748B] bg-white border border-[#E5E7EB] px-3 py-1 rounded-full">
                          {group.length} error{group.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div>
                        {group.map((err, i) => (
                          <ErrorCard key={`${key}-${i}`} error={err} index={i + 1} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          );
        })() : activeTab === "Dual Assessment" ? (() => {
          const rawOutput = data?.raw_grader_output || {};
          const primaryData = rawOutput.primary || {};
          const secondaryBands = rawOutput.secondary_bands || null;
          const subCategoryScores = primaryData.sub_category_scores || {};

          const criteriaConfig = [
            { title: "Task Response",                key: "Task Response",                primaryBand: data?.response_band,  secBand: secondaryBands?.response_band },
            { title: "Coherence & Cohesion",         key: "Coherence & Cohesion",         primaryBand: data?.coherence_band, secBand: secondaryBands?.coherence_band },
            { title: "Lexical Resource",             key: "Lexical Resource",             primaryBand: data?.vocabulary_band,secBand: secondaryBands?.vocabulary_band },
            { title: "Grammatical Range & Accuracy", key: "Grammatical Range & Accuracy", primaryBand: data?.grammar_band,   secBand: secondaryBands?.grammar_band },
          ];

          const bandColor = (b) => b >= 7 ? "text-[#30C3A9]" : b >= 5.5 ? "text-[#F59E0B]" : "text-[#EF4444]";
          const fmt = (v) => v != null ? parseFloat(v).toFixed(1) : '—';
          const avg = (a, b) => (a != null && b != null) ? ((parseFloat(a) + parseFloat(b)) / 2).toFixed(1) : fmt(a ?? b);

          return (
          <div className="space-y-4">
            {criteriaConfig.map((crit, sIdx) => {
              const pb = crit.primaryBand != null ? parseFloat(crit.primaryBand) : null;
              const sb = crit.secBand != null ? parseFloat(crit.secBand) : null;
              const overallBand = pb != null ? pb : sb;
              const subRows = subCategoryScores[crit.key] || [];
              return (
              <div key={sIdx} className="bg-white rounded-[16px] border border-[#D1D5DB] shadow-sm overflow-hidden">
                <div className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => toggleSection('dualAssessment', sIdx)}>
                  <div className="flex items-center gap-4">
                    <span className={`text-[22px] font-black ${overallBand != null ? bandColor(overallBand) : 'text-gray-300'}`} style={{ fontFamily: "'Nunito', sans-serif", minWidth: 44 }}>
                      {fmt(overallBand)}
                    </span>
                    <h3 className="text-[15px] font-bold text-[#101828]">{crit.title}</h3>
                  </div>
                  <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.dualAssessment.includes(sIdx) ? "rotate-180" : ""}`} />
                </div>

                {expandedSections.dualAssessment.includes(sIdx) && (
                  <div className="px-4 md:px-8 pb-4 md:pb-6 pt-4 border-t border-[#E5E7EB] animate-in fade-in slide-in-from-top-2 duration-200 space-y-6">

                    {/* Dual model score row */}
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 bg-[#F9FAFB] rounded-[10px] px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide">gpt-4o-mini</span>
                        <span className={`text-[20px] font-black ${pb != null ? bandColor(pb) : 'text-gray-300'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{fmt(pb)}</span>
                      </div>
                      <div className="w-px h-8 bg-[#E5E7EB]"></div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide">gpt-4o</span>
                        <span className={`text-[20px] font-black ${sb != null ? bandColor(sb) : 'text-gray-300'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{fmt(sb)}</span>
                      </div>
                      {sb != null && pb != null && (
                        <>
                          <div className="w-px h-8 bg-[#E5E7EB]"></div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Average</span>
                            <span className={`text-[20px] font-black ${bandColor(parseFloat(avg(pb, sb)))}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{avg(pb, sb)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sub-category scores table */}
                    {subRows.length > 0 ? (
                      <div className="overflow-x-auto border border-[#E5E7EB] rounded-[12px]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                              <th className="px-5 py-3.5 text-[12px] font-bold text-[#6B7280] uppercase tracking-wide">Sub Category</th>
                              <th className="px-5 py-3.5 text-[12px] font-bold text-[#6B7280] uppercase tracking-wide">Band</th>
                              <th className="px-5 py-3.5 text-[12px] font-bold text-[#6B7280] uppercase tracking-wide">Strength</th>
                              <th className="px-5 py-3.5 text-[12px] font-bold text-[#6B7280] uppercase tracking-wide">Weakness</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F2F4F7]">
                            {subRows.map((row, rIdx) => {
                              const rb = row.band != null ? parseFloat(row.band) : null;
                              return (
                                <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-5 py-4 text-[13px] font-semibold text-[#101828]">{row.name}</td>
                                  <td className={`px-5 py-4 text-[14px] font-black ${rb != null ? bandColor(rb) : 'text-gray-300'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{fmt(rb)}</td>
                                  <td className="px-5 py-4 text-[13px] text-[#374151] leading-snug">{row.strength}</td>
                                  <td className="px-5 py-4 text-[13px] text-[#374151] leading-snug">{row.weakness}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[13px] text-gray-400 text-center py-4">Sub-category data will appear on your next graded submission.</p>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
          );
        })()
        : activeTab === "Model Answer" ? (() => {
          const ma = data?.model_answer;
          if (!ma) return (
            <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto"><FileText className="text-gray-300" /></div>
                <h3 className="text-[18px] font-bold text-[#101828]">Model Answer</h3>
                <p className="text-gray-400 text-[14px]">Model answer is being generated. Please check back shortly.</p>
              </div>
            </div>
          );
          const wordCount = ma.text ? ma.text.trim().split(/\s+/).length : 0;
          return (
          <div className="space-y-8">
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 md:px-10 py-4 md:py-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-[#101828]">Improved Report</h3>
                  <p className="text-[13px] text-gray-400 mt-0.5">Word count: {wordCount}</p>
                </div>
                <div className="bg-[#ECFDF5] text-[#10B981] px-4 py-1.5 rounded-full text-[12px] font-black tracking-tight border border-[#D1FAE5]">
                  BAND {ma.estimated_band ?? 8.0}
                </div>
              </div>
              <div className="p-4 md:p-10">
                <div className="bg-[#F0FDF4] rounded-[16px] p-4 md:p-10 border border-[#DCFCE7]">
                  <h4 className="text-[14px] font-bold text-[#101828] mb-6 uppercase tracking-wider">Revised Report</h4>
                  <p className="text-[15px] text-[#101828] leading-[1.8] font-semibold whitespace-pre-wrap">{ma.text}</p>
                </div>
              </div>
            </div>

            {ma.key_changes && ma.key_changes.length > 0 && (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 md:px-10 py-4 md:py-6 border-b border-gray-100">
                <h3 className="text-[16px] font-bold text-[#101828]">Key Improvements Made</h3>
                <p className="text-[13px] text-gray-400 mt-0.5">Changes from the original to the improved version</p>
              </div>
              <div className="p-4 md:p-10">
                <ul className="space-y-6">
                  {ma.key_changes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-2.5 shrink-0" />
                      <span className="text-[14px] text-[#101828] leading-relaxed font-semibold">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            )}
          </div>
          );
        })()
        : activeTab === "Vocabulary" ? (() => {
          const va = data?.vocabulary_analysis;
          if (!va || !va.categories?.length) return (
            <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto"><FileText className="text-gray-300" /></div>
                <h3 className="text-[18px] font-bold text-[#101828]">Vocabulary Analysis</h3>
                <p className="text-gray-400 text-[14px]">Vocabulary analysis is being generated. Please check back shortly.</p>
              </div>
            </div>
          );
          return (
          <div className="space-y-6">
            {va.categories.map((cat, catIdx) => {
              const sectionKey = `vocab_${catIdx}`;
              const isOpen = expandedSections.vocabulary?.includes(catIdx) ?? catIdx === 0;
              return (
              <div key={catIdx} className="bg-white rounded-[16px] border border-[#D1D5DB] shadow-sm overflow-hidden">
                <div className="px-4 md:px-10 py-4 md:py-6 border-b border-[#E5E7EB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => toggleSection('vocabulary', catIdx)}>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#101828]">{cat.name}</h3>
                    {cat.description && <p className="text-[14px] text-[#101828] mt-1 font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{cat.description}</p>}
                  </div>
                  <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </div>
                {isOpen && (
                  <div className="p-4 md:p-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {(cat.words || []).map((item, idx) => (
                      <div key={idx} className="bg-white border border-[#D1D5DB] rounded-[12px] overflow-hidden">
                        <div className="px-4 md:px-6 py-4 border-b border-[#E5E7EB]">
                          <h4 className="text-[15px] font-bold text-[#101828]">{item.word}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]">
                          <div className="px-6 py-5">
                            <p className="text-[14px] text-[#475467] leading-relaxed font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.definition}</p>
                          </div>
                          <div className="px-6 py-5 flex items-center">
                            <div className="w-full bg-[#1018280D] rounded-[10px] px-5 py-3 text-[14px] text-[#101828] font-semibold border border-[#10182826] leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>
                              {item.example}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
          );
        })()
        : activeTab === "Grammar" ? (() => {
          const ga = data?.grammar_analysis;
          if (!ga) return (
            <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto"><FileText className="text-gray-300" /></div>
                <h3 className="text-[18px] font-bold text-[#101828]">Grammar Analysis</h3>
                <p className="text-gray-400 text-[14px]">Grammar analysis is being generated. Please check back shortly.</p>
              </div>
            </div>
          );
          return (
          <div className="space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
              <h3 className="text-[18px] font-bold text-[#101828] leading-snug" style={{ fontFamily: "'Nunito', sans-serif" }}>Overview</h3>
              <div className="space-y-3">
                <p className="text-[15px] text-[#101828] leading-relaxed font-semibold" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <span className="font-bold">Strengths:</span> {ga.overview_strengths || '—'}
                </p>
                <p className="text-[15px] text-[#101828] leading-relaxed font-semibold" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <span className="font-bold">Weaknesses:</span> {ga.overview_weaknesses || '—'}
                </p>
              </div>
            </div>

            {/* Grammatical Structures Used */}
            <div className="bg-white rounded-[24px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div className="px-4 md:px-10 py-4 md:py-6 border-b border-[#E5E7EB]">
                <h3 className="text-[16px] font-bold text-[#101828]">Grammatical Structures Used</h3>
                <p className="text-[13px] text-gray-400 mt-0.5">Structures identified in the report</p>
              </div>
              <div className="p-4 md:p-10">
                <ul className="space-y-6">
                  {/* List of structures */}
                  {(ga.structures_used || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-2 shrink-0" />
                      <span className="text-[16px] text-[#101828] leading-none font-semibold" style={{ fontFamily: "'Nunito', sans-serif" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggested Grammatical Enrichments */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div className="px-4 md:px-8 py-4 md:py-5 border-b border-[#E5E7EB]">
                <h3 className="text-[18px] font-bold text-[#101828] leading-[20px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Suggested Grammatical Enrichments</h3>
                <p className="text-[16px] text-[#475467] mt-2 leading-none font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>Techniques to boost your grammar score</p>
              </div>

              <div className="p-4 md:p-8 space-y-8 md:space-y-10">
                {(ga.enrichment_suggestions || []).map((item, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-[18px] font-semibold text-[#101828] leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.original}</h4>
                    <p className="text-[16px] text-[#101828] leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.explanation}</p>
                    <div className="bg-[#1018280D] rounded-[10px] px-6 py-3 flex items-center text-[16px] text-[#101828] font-semibold leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {item.improved}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {ga.expert_tips && ga.expert_tips.length > 0 && (
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div className="px-4 md:px-8 py-4 md:py-5 border-b border-[#E5E7EB]">
                <h3 className="text-[18px] font-bold text-[#101828] leading-[20px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Expert Tips</h3>
              </div>
              <div className="p-4 md:p-8">
                <ul className="space-y-6">
                  {ga.expert_tips.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-2 shrink-0" />
                      <span className="text-[16px] text-[#101828] leading-[1.15] font-semibold" style={{ fontFamily: "'Nunito', sans-serif" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            )}
          </div>
          );
        })()
        : activeTab === "Argumentation" ? (() => {
          const arg = data?.argumentation_analysis;
          if (!arg || Object.keys(arg).length === 0) {
            return <EmptyTabState title="Argumentation Analysis" message="Argumentation analysis is being generated. Please check back shortly." />;
          }
          const alignment = arg.task_alignment || {};
          const intro = arg.introduction_analysis || {};
          const concl = arg.conclusion_analysis || {};
          const auth = arg.authenticity || {};
          const argMap = arg.argument_map || [];
          return (
            <div className="space-y-8">
              {arg.overall_summary && (
                <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden px-4 md:px-8 py-4 md:py-6">
                  <h3 className="text-[18px] font-bold text-[#101828] mb-3">Argumentation Summary</h3>
                  <p className="text-[16px] text-[#101828] leading-relaxed">{arg.overall_summary}</p>
                </div>
              )}

              {Object.keys(alignment).length > 0 && (
                <CollapsibleCard title="Task Alignment & Coverage" sectionKey="argAlignment" expanded={expandedSections.argAlignment} onToggle={toggleSection}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-[13px] text-[#475467]"><span className="font-bold text-[#101828]">Prompt Type:</span> {alignment.prompt_type_identified || 'Unknown'}</p>
                      <p className="text-[13px] text-[#475467]">
                        <span className="font-bold text-[#101828]">Your Interpretation:</span> {alignment.prompt_type_student_treated_as || 'Unknown'}
                        {alignment.correctly_interpreted
                          ? <span className="ml-2 text-[#00C9B1] font-bold">Correct</span>
                          : <span className="ml-2 text-[#EA4335] font-bold">Incorrect</span>}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {(alignment.required_elements || []).map((el, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[13px] font-bold text-[#101828] mb-1">
                            <span>{el.element}</span>
                            <span>{el.coverage_percentage}%</span>
                          </div>
                          <div className="h-[8px] bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${el.coverage_percentage || 0}%` }} />
                          </div>
                          {el.note && <p className="text-[12px] text-[#475467] mt-1">{el.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {alignment.misinterpretation_warning && (
                    <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-[10px] p-4 text-[14px] text-[#B91C1C]">
                      <span className="font-bold">Warning:</span> {alignment.misinterpretation_warning}
                    </div>
                  )}
                </CollapsibleCard>
              )}

              {(Object.keys(intro).length > 0 || Object.keys(concl).length > 0) && (
                <CollapsibleCard title="Structural Components" sectionKey="argStructure" expanded={expandedSections.argStructure} onToggle={toggleSection}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(intro).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[15px] font-bold text-[#101828]">Introduction</h4>
                          <StarRating count={intro.overall_quality_stars || 0} />
                        </div>
                        <p className="text-[14px] text-[#475467]"><span className="font-bold">Position:</span> {intro.position_statement_clarity || 'N/A'}</p>
                        <p className="text-[14px] text-[#475467]"><span className="font-bold">Thesis:</span> {intro.thesis_present || 'N/A'}</p>
                        {intro.recommendation && (
                          <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px]">{intro.recommendation}</div>
                        )}
                      </div>
                    )}
                    {Object.keys(concl).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[15px] font-bold text-[#101828]">Conclusion</h4>
                          <StarRating count={concl.overall_quality_stars || 0} />
                        </div>
                        <p className="text-[14px] text-[#475467]"><span className="font-bold">Summarizes Points:</span> {concl.summarizes_main_points || 'N/A'}</p>
                        <p className="text-[14px] text-[#475467]">
                          <span className="font-bold">New Ideas Introduced:</span>{' '}
                          {concl.introduces_new_ideas ? <span className="text-[#EA4335] font-bold">Yes (avoid)</span> : <span className="text-[#00C9B1] font-bold">No</span>}
                        </p>
                        {concl.recommendation && (
                          <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px]">{concl.recommendation}</div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleCard>
              )}

              {argMap.length > 0 && (
                <CollapsibleCard title="Body Paragraph Mapping" sectionKey="argMap" expanded={expandedSections.argMap} onToggle={toggleSection}>
                  <div className="space-y-6">
                    {argMap.map((item, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-[12px] p-4 md:p-6 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-bold text-[#475467] uppercase">{item.paragraph}</p>
                            <p className="text-[15px] font-bold text-[#101828]">{item.main_claim}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] text-[#475467]">Evidence Quality</p>
                            <StarRating count={item.evidence_quality_stars || 0} />
                          </div>
                        </div>
                        <p className="text-[14px] text-[#475467]">
                          <span className="font-bold text-[#101828]">Explanation:</span> {item.explanation_depth}
                          {item.explanation_note && <em className="ml-1">({item.explanation_note})</em>}
                        </p>
                        {(item.missing_elements || []).length > 0 && (
                          <div className="bg-[#FEF2F2] rounded-[10px] p-4">
                            <p className="text-[13px] font-bold text-[#B91C1C] mb-2">Missing Elements</p>
                            <BulletList items={item.missing_elements} colorClass="text-[#B91C1C]" />
                          </div>
                        )}
                        {item.recommendation && (
                          <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px]">{item.recommendation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleCard>
              )}

              {Object.keys(auth).length > 0 && (
                <CollapsibleCard title="Authenticity & Pitfalls" sectionKey="argAuth" expanded={expandedSections.argAuth} onToggle={toggleSection}>
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <span className="text-[14px] font-bold text-[#101828]">Natural Expression Ratio</span>
                    <div className="flex-1 min-w-[120px] h-[10px] bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00C9B1] rounded-full" style={{ width: `${auth.formulaic_vs_natural_percentage || 0}%` }} />
                    </div>
                    <span className="text-[18px] font-bold text-[#101828]">{auth.formulaic_vs_natural_percentage || 0}%</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AuthenticityList title="Memorized Phrases" list={auth.memorized_phrases} textKey="phrase" fixKey="suggestion" />
                    <AuthenticityList title="Over-generalizations" list={auth.overgeneralizations} textKey="text" fixKey="suggested_fix" />
                    <AuthenticityList title="Mother Tongue Interference" list={auth.mother_tongue_interference} textKey="text" fixKey="suggested_fix" />
                    <AuthenticityList title="Cliches" list={auth.cliches_detected} textKey="phrase" fixKey="suggestion" />
                  </div>
                </CollapsibleCard>
              )}
            </div>
          );
        })()
        : activeTab === "Data Structure" ? (() => {
          const dsa = data?.data_structure_analysis;
          if (!dsa || Object.keys(dsa).length === 0) {
            return <EmptyTabState title="Data Structure Analysis" message="Data structure analysis is being generated. Please check back shortly." />;
          }
          const intro = dsa.introduction_analysis || {};
          const overview = dsa.overview_analysis || {};
          const selection = dsa.data_selection_quality || {};
          const alignment = dsa.task_alignment || {};
          const auth = dsa.authenticity || {};
          const coverageMap = dsa.data_coverage_map || [];
          return (
          <div className="space-y-8">
            {(dsa.overall_summary || dsa.overview) && (
              <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden px-4 md:px-8 py-4 md:py-6">
                <h3 className="text-[18px] font-bold text-[#101828] mb-3">Data Structure Summary</h3>
                <p className="text-[16px] text-[#101828] leading-snug">{dsa.overall_summary || dsa.overview}</p>
              </div>
            )}

            {Object.keys(intro).length > 0 && (
            <CollapsibleCard title="Introduction Analysis" sectionKey="introAnalysis" expanded={expandedSections.introAnalysis} onToggle={toggleSection}>
              <div className="flex flex-wrap items-center gap-3 md:gap-6 mb-4">
                <div className="text-[13px]">
                  <span className="text-[#475467] font-medium">Paraphrase:</span>{' '}
                  <span className="font-bold text-[#101828]">{intro.paraphrase_quality || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#101828]">
                  {intro.identifies_chart_type ? <CheckCircle size={18} className="text-[#26C1A1]" /> : <XCircle size={18} className="text-[#FF5E4D]" />}
                  <span>Chart Type</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#101828]">
                  {intro.identifies_time_period ? <CheckCircle size={18} className="text-[#26C1A1]" /> : <XCircle size={18} className="text-[#FF5E4D]" />}
                  <span>Time Period</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#101828]">
                  {intro.identifies_units ? <CheckCircle size={18} className="text-[#26C1A1]" /> : <XCircle size={18} className="text-[#FF5E4D]" />}
                  <span>Units</span>
                </div>
                <StarRating count={intro.overall_quality_stars || 0} />
              </div>
              {intro.introduction_quote && (
                <div className="w-full bg-[#1018280D] border border-[#10182833] rounded-[10px] px-4 md:px-6 py-3 text-[14px] md:text-[16px] text-[#101828] font-semibold leading-relaxed mb-6">
                  {intro.introduction_quote}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-4">
                  <h4 className="text-[16px] font-bold text-[#00C9B1]">Strengths</h4>
                  <BulletList items={intro.strengths} />
                </div>
                <div className="space-y-4">
                  <h4 className="text-[16px] font-bold text-[#FF4D4D]">Weaknesses</h4>
                  <BulletList items={intro.weaknesses} colorClass="text-[#101828]" />
                </div>
              </div>
              {intro.recommendation && (
                <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-5 text-[14px] leading-relaxed mt-6">
                  <span className="font-bold text-[#00C9B1]">Recommendation:</span>{' '}
                  <span className="text-[#101828] font-semibold ml-1">{intro.recommendation}</span>
                </div>
              )}
            </CollapsibleCard>
            )}

            {coverageMap.length > 0 && (
            <CollapsibleCard title="Data Coverage Map" sectionKey="dataCoverageMap" expanded={expandedSections.dataCoverageMap} onToggle={toggleSection}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-b border-[#D1D5DB]">
                  <thead>
                    <tr className="bg-[#F2F4F7]">
                      <th className="px-6 py-4 text-[14px] font-bold text-[#101828]">Data Series</th>
                      <th className="px-6 py-4 text-[14px] font-bold text-[#101828] text-center">Status</th>
                      <th className="px-6 py-4 text-[14px] font-bold text-[#101828]">Evidence Quality</th>
                      <th className="px-6 py-4 text-[14px] font-bold text-[#101828] text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D1D5DB]">
                    {coverageMap.map((row, i) => {
                      const isMissing = (row.coverage_status || '').toLowerCase().includes('miss');
                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-6 py-5 text-[14px] font-medium text-[#101828]">{row.data_series}</td>
                          <td className="px-6 py-5 text-center">
                            <div className={`flex items-center justify-center gap-2 text-[14px] font-semibold ${isMissing ? 'text-[#FF5E4D]' : 'text-[#00C9B1]'}`}>
                              {isMissing ? <XCircle size={20} /> : <CheckCircle size={20} />}
                              <span>{row.coverage_status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-[14px] text-[#475467]">{row.evidence_quality_text || row.evidence_quality || '—'}</td>
                          <td className="px-6 py-5 text-center text-[14px] font-bold text-[#101828]">{row.coverage_score ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-8 mt-8">
                {coverageMap.map((row, i) => (
                  <div key={i} className="space-y-4">
                    <h4 className="text-[16px] font-bold text-[#101828]">{row.data_series}</h4>
                    {(row.missing_elements || []).length > 0 && (
                      <BulletList items={row.missing_elements} colorClass="text-[#EA4335]" />
                    )}
                    {row.recommendation && (
                      <div className="bg-[#30C3A926] border border-[#30C3A926] rounded-[10px] p-5 text-[14px]">
                        <span className="font-bold text-[#00C9B1]">Recommendation:</span>{' '}
                        <span className="text-[#101828] font-bold ml-1">{row.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleCard>
            )}

            {Object.keys(overview).length > 0 && (
            <CollapsibleCard title="Overview Analysis" sectionKey="dsOverview" expanded={expandedSections.dsOverview} onToggle={toggleSection}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <p className="text-[14px] text-[#475467]"><span className="font-bold text-[#101828]">Overview Present:</span> {overview.overview_present || 'N/A'}</p>
                <p className="text-[14px] text-[#475467]"><span className="font-bold text-[#101828]">Main Trends Captured:</span> {overview.main_trends_captured || 'N/A'}</p>
                <p className="text-[14px] text-[#475467]">
                  <span className="font-bold text-[#101828]">Specific Data in Overview:</span>{' '}
                  {overview.specific_data_in_overview ? <span className="text-[#EA4335] font-bold">Yes: remove data</span> : <span className="text-[#00C9B1] font-bold">No: correct</span>}
                </p>
                <p className="text-[14px] text-[#475467]">
                  <span className="font-bold text-[#101828]">Consistent with Body:</span>{' '}
                  {overview.consistent_with_body ? <span className="text-[#00C9B1] font-bold">Yes</span> : <span className="text-[#EA4335] font-bold">No</span>}
                </p>
              </div>
              {overview.recommendation && (
                <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-5 text-[14px] mt-4">{overview.recommendation}</div>
              )}
            </CollapsibleCard>
            )}

            {Object.keys(selection).length > 0 && (
            <CollapsibleCard title="Data Selection Quality" sectionKey="dsSelection" expanded={expandedSections.dsSelection} onToggle={toggleSection}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[14px] text-[#475467]"><span className="font-bold text-[#101828]">Selectivity:</span> {selection.selectivity_level || 'N/A'}</p>
                  <p className="text-[14px] text-[#475467]"><span className="font-bold text-[#101828]">Precision:</span> {selection.data_precision_quality || 'N/A'}</p>
                  {selection.selectivity_band && <p className="text-[14px] font-bold text-[#00C9B1]">Band {selection.selectivity_band}</p>}
                </div>
                <div className="flex gap-8">
                  <div><p className="text-[28px] font-black text-[#EA4335]">{selection.unsupported_trend_claims_count || 0}</p><p className="text-[12px] text-[#475467]">Unsupported Claims</p></div>
                  <div><p className="text-[28px] font-black text-[#00C9B1]">{selection.meaningful_comparisons_count || 0}</p><p className="text-[12px] text-[#475467]">Comparisons Made</p></div>
                </div>
              </div>
            </CollapsibleCard>
            )}

            {Object.keys(alignment).length > 0 && (
            <CollapsibleCard title="Task Alignment" sectionKey="dsAlignment" expanded={expandedSections.dsAlignment} onToggle={toggleSection}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[14px]"><span className="font-bold">Chart Type:</span> {alignment.chart_type_identified || 'N/A'}</p>
                  <p className="text-[14px]"><span className="font-bold">Treated As:</span> {alignment.chart_type_student_treated_as || 'N/A'}</p>
                </div>
                <div className="space-y-3">
                  {(alignment.required_elements || []).map((el, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[13px] font-bold"><span>{el.element}</span><span>{el.coverage_percentage}%</span></div>
                      <div className="h-[8px] bg-[#F3F4F6] rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${el.coverage_percentage || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {alignment.misinterpretation_warning && (
                <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-[10px] p-4 text-[14px] text-[#B91C1C] mt-4">{alignment.misinterpretation_warning}</div>
              )}
            </CollapsibleCard>
            )}

            {Object.keys(auth).length > 0 && (
            <CollapsibleCard title="Authenticity & Natural Language" sectionKey="dsAuth" expanded={expandedSections.dsAuth} onToggle={toggleSection}>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="text-[14px] font-bold">Natural Expression Ratio</span>
                <div className="flex-1 min-w-[120px] h-[10px] bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00C9B1] rounded-full" style={{ width: `${auth.formulaic_vs_natural_percentage || 0}%` }} />
                </div>
                <span className="font-bold">{auth.formulaic_vs_natural_percentage || 0}%</span>
              </div>
              {auth.authenticity_note && <p className="text-[14px] text-[#475467] mb-4">{auth.authenticity_note}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AuthenticityList title="Memorized Phrases" list={auth.memorized_phrases} textKey="phrase" fixKey="suggestion" />
                <AuthenticityList title="Over-generalizations" list={auth.over_generalizations} textKey="phrase" fixKey="suggestion" />
                <AuthenticityList title="Mother Tongue Interference" list={auth.mother_tongue_interference} textKey="phrase" fixKey="suggestion" />
                <AuthenticityList title="Cliches" list={auth.cliches_detected} textKey="phrase" fixKey="suggestion" />
              </div>
            </CollapsibleCard>
            )}
          </div>
          );
        })()
        : activeTab === "Structure" ? (() => {
          const ls = data?.letter_structure_analysis;
          if (!ls || Object.keys(ls).length === 0) {
            return <EmptyTabState title="Letter Structure Analysis" message="Structure analysis is being generated. Please check back shortly." />;
          }
          const opening = ls.opening_analysis || {};
          const closing = ls.closing_analysis || {};
          const bulletMap = ls.bullet_development_map || [];
          const auth = ls.authenticity || {};
          return (
            <div className="space-y-8">
              {ls.overall_summary && (
                <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm px-4 md:px-8 py-4 md:py-6">
                  <h3 className="text-[18px] font-bold text-[#101828] mb-3">Structure Summary</h3>
                  <p className="text-[16px] text-[#101828] leading-relaxed">{ls.overall_summary}</p>
                </div>
              )}

              {Object.keys(opening).length > 0 && (
                <CollapsibleCard title="Opening & Salutation Analysis" sectionKey="lsOpening" expanded={expandedSections.lsOpening} onToggle={toggleSection}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[15px] font-bold text-[#101828]">Opening Quality</h4>
                    <StarRating count={opening.overall_quality_stars || 0} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[12px] font-bold text-[#475467] uppercase mb-1">Salutation</p>
                      <p className="text-[14px] font-semibold text-[#101828]">{opening.salutation_used || 'Not found'}</p>
                      <p className="text-[13px] text-[#475467] mt-1">{opening.salutation_correct}</p>
                      {opening.salutation_should_be && <p className="text-[13px] text-[#00C9B1] mt-1">Should be: {opening.salutation_should_be}</p>}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#475467] uppercase mb-1">Purpose</p>
                      <p className="text-[14px] font-semibold text-[#101828]">{opening.purpose_clarity || 'N/A'}</p>
                      {opening.purpose_quote && <p className="text-[13px] italic text-[#475467] mt-2">"{opening.purpose_quote}"</p>}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#475467] uppercase mb-1">Register</p>
                      <p className="text-[14px] font-semibold text-[#101828]">{opening.register_established || 'N/A'}</p>
                      {opening.register_issues && <p className="text-[13px] text-[#EA4335] mt-1">{opening.register_issues}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div><h4 className="text-[15px] font-bold text-[#00C9B1] mb-2">Strengths</h4><BulletList items={opening.strengths} /></div>
                    <div><h4 className="text-[15px] font-bold text-[#FF4D4D] mb-2">Weaknesses</h4><BulletList items={opening.weaknesses} /></div>
                  </div>
                  {opening.recommendation && (
                    <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px] mt-4">{opening.recommendation}</div>
                  )}
                </CollapsibleCard>
              )}

              {bulletMap.length > 0 && (
                <CollapsibleCard title="Bullet Point Development Map" sectionKey="lsBullets" expanded={expandedSections.lsBullets} onToggle={toggleSection}>
                  <div className="space-y-6">
                    {bulletMap.map((bullet, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-[12px] p-4 md:p-6 space-y-3">
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-bold text-[#475467]">Bullet {bullet.bullet_number || i + 1}</p>
                            <p className="text-[15px] font-bold text-[#101828]">{bullet.bullet_text}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[18px] font-black text-[#101828]">Band {bullet.strength_score || '—'}</p>
                            <p className="text-[13px] text-[#475467]">Addressed: {bullet.addressed}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StarRating count={bullet.development_stars || 0} />
                          <span className="text-[14px] text-[#475467]">{bullet.development_text}</span>
                        </div>
                        <p className="text-[14px] text-[#475467]">
                          <span className="font-bold">Specificity:</span> {bullet.specificity_level}
                          {bullet.specificity_note && <span className="ml-1">({bullet.specificity_note})</span>}
                        </p>
                        {(bullet.missing_elements || []).length > 0 && <BulletList items={bullet.missing_elements} colorClass="text-[#EA4335]" />}
                        {bullet.recommendation && (
                          <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px]">{bullet.recommendation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleCard>
              )}

              {Object.keys(closing).length > 0 && (
                <CollapsibleCard title="Closing & Sign-off Analysis" sectionKey="lsClosing" expanded={expandedSections.lsClosing} onToggle={toggleSection}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[15px] font-bold text-[#101828]">Closing Quality</h4>
                    <StarRating count={closing.overall_quality_stars || 0} />
                  </div>
                  <p className="text-[14px] text-[#475467]"><span className="font-bold">Sign-off:</span> {closing.signoff_used || 'N/A'} ({closing.signoff_appropriate})</p>
                  {closing.recommendation && (
                    <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px] mt-4">{closing.recommendation}</div>
                  )}
                </CollapsibleCard>
              )}

              {Object.keys(auth).length > 0 && (
                <CollapsibleCard title="Authenticity & Pitfalls" sectionKey="lsAuth" expanded={expandedSections.lsAuth} onToggle={toggleSection}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AuthenticityList title="Memorized Phrases" list={auth.memorized_phrases} textKey="phrase" fixKey="suggestion" />
                    <AuthenticityList title="Register Issues" list={auth.register_issues} textKey="text" fixKey="suggested_fix" />
                  </div>
                </CollapsibleCard>
              )}
            </div>
          );
        })()
        : activeTab === "Flow & Logic" ? (() => {
          const flow = data?.flow_logic_analysis;
          if (!flow || Object.keys(flow).length === 0) {
            return <EmptyTabState title="Flow & Logic Analysis" message="Flow and logic analysis is being generated. Please check back shortly." />;
          }
          const fallacies = flow.logical_fallacies || [];
          const paragraphFlow = flow.paragraph_flow_analysis || flow.paragraph_transitions || [];
          const cohesion = flow.cohesion_quality || flow.cohesive_devices || {};
          const registerTone = flow.register_tone || flow.register_tone_consistency || null;
          const flowScore = flow.overall_flow_score ?? null;
          return (
          <div className="space-y-6">
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden px-4 md:px-10 py-5 md:py-8 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-[18px] font-bold text-[#101828]">Overall Flow Score</h3>
                <p className="text-[14px] text-[#101828] leading-snug">
                  {flow.flow_summary || 'Flow and coherence analysis from your submission.'}
                </p>
              </div>
              {flowScore != null && (
                <div className="text-[32px] font-bold shrink-0">
                  <span className="text-[#3B82F6]">{flowScore}</span><span className="text-[#101828]">/100</span>
                </div>
              )}
            </div>

            {fallacies.length > 0 && (
            <CollapsibleCard title="Logical Issues Detected" sectionKey="logicalIssues" expanded={expandedSections.logicalIssues} onToggle={toggleSection}>
              <div className="space-y-6">
                {fallacies.map((f, i) => (
                  <div key={i} className="space-y-3 border-b border-[#E5E7EB] last:border-0 pb-6 last:pb-0">
                    <h4 className="text-[15px] font-bold text-[#EA4335]">{f.type}{f.location ? ` (${f.location})` : ''}</h4>
                    {f.problematic_text && (
                      <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-[10px] p-4 text-[15px] font-semibold">"{f.problematic_text}"</div>
                    )}
                    {f.explanation && <p className="text-[14px] text-[#475467]">{f.explanation}</p>}
                    {f.impact && <p className="text-[14px] text-[#475467]"><span className="font-bold">Impact:</span> {f.impact}</p>}
                    {f.suggested_revision && (
                      <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4 text-[14px]">
                        <span className="font-bold text-[#00C9B1]">Fix:</span> {f.suggested_revision}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleCard>
            )}

            {paragraphFlow.length > 0 && (
            <CollapsibleCard title="Paragraph-to-Paragraph Flow" sectionKey="flowParagraph" expanded={expandedSections.flowParagraph} onToggle={toggleSection}>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[560px]">
                  <thead>
                    <tr className="bg-[#F2F4F7]">
                      <th className="px-6 py-2 text-[14px] font-bold text-[#101828]">Transition</th>
                      <th className="px-6 py-2 text-[14px] font-bold text-[#101828]">Strength</th>
                      <th className="px-6 py-2 text-[14px] font-bold text-[#101828]">Quality</th>
                      <th className="px-6 py-2 text-[14px] font-bold text-[#101828]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D1D5DB]">
                    {paragraphFlow.map((row, i) => {
                      const from = row.from || row.from_paragraph || '';
                      const to = row.to || row.to_paragraph || '';
                      const strength = row.flow_strength ?? row.strength ?? '—';
                      const quality = row.quality || '—';
                      const note = row.reason || row.notes || row.suggestion || row.logical_gap || '';
                      const qColor = (row.quality || '').toLowerCase().includes('smooth') || (row.flow_strength || 0) >= 70 ? 'text-[#30C3A9]' : 'text-[#F59E0B]';
                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-6 py-3 text-[14px] text-[#101828]">{from && to ? `${from} → ${to}` : (row.transition || row.trans || '—')}</td>
                          <td className="px-6 py-3 text-[14px] font-bold text-[#30C3A9]">{strength}{typeof strength === 'number' ? '%' : ''}</td>
                          <td className={`px-6 py-3 text-[14px] font-bold ${qColor}`}>{quality}</td>
                          <td className="px-6 py-3 text-[14px] text-[#475467]">{note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleCard>
            )}

            {registerTone && (
            <CollapsibleCard title="Register & Tone Consistency" sectionKey="flowRegister" expanded={expandedSections.flowRegister} onToggle={toggleSection}>
              {typeof registerTone === 'string' ? (
                <p className="text-[15px] text-[#475467] leading-relaxed">{registerTone}</p>
              ) : (
                <div className="space-y-3">
                  {registerTone.summary && <p className="text-[15px] text-[#475467]">{registerTone.summary}</p>}
                  {registerTone.consistency_rating && <p className="text-[14px] font-bold text-[#101828]">Rating: {registerTone.consistency_rating}</p>}
                  {(registerTone.issues || []).map((issue, i) => (
                    <p key={i} className="text-[14px] text-[#475467]">{typeof issue === 'string' ? issue : issue.description || issue.text}</p>
                  ))}
                </div>
              )}
            </CollapsibleCard>
            )}

            {cohesion && Object.keys(cohesion).length > 0 && (
            <CollapsibleCard title="Cohesive Devices" sectionKey="cohesiveDevices" expanded={expandedSections.cohesiveDevices} onToggle={toggleSection}>
              <div className="space-y-4">
                {cohesion.cohesive_device_variety != null && (
                  <p className="text-[14px] font-bold text-[#101828]">Device Variety Score: {cohesion.cohesive_device_variety}%</p>
                )}
                {cohesion.variety_rating && <p className="text-[14px] text-[#475467]">{cohesion.variety_rating}</p>}
                {cohesion.variety_improvement_tip && <p className="text-[14px] text-[#475467]">{cohesion.variety_improvement_tip}</p>}
                {(cohesion.devices_used || []).length > 0 && (
                  <p className="text-[14px] text-[#475467]"><span className="font-bold text-[#101828]">Devices Used:</span> {cohesion.devices_used.join(', ')}</p>
                )}
                {(cohesion.devices_overused || []).map((d, i) => (
                  <p key={i} className="text-[14px] text-[#EA4335]"><span className="font-bold">{d.device || d}</span>{d.count ? ` (${d.count}×)` : ''}{d.suggestion ? `, ${d.suggestion}` : ''}</p>
                ))}
                {(cohesion.devices_underused || []).length > 0 && (
                  <div>
                    <p className="text-[13px] font-bold text-[#475467] mb-2">Underused Categories</p>
                    <BulletList items={cohesion.devices_underused} />
                  </div>
                )}
                {(cohesion.pronoun_reference_analysis || []).map((p, i) => (
                  <div key={i} className="border border-[#E5E7EB] rounded-[10px] p-4">
                    <p className="text-[14px] font-bold text-[#101828]">"{p.pronoun}" ({p.clarity})</p>
                    {p.context && <p className="text-[13px] text-[#475467] mt-1">{p.context}</p>}
                  </div>
                ))}
              </div>
            </CollapsibleCard>
            )}
          </div>
          );
        })()
        : (
          <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <FileText className="text-gray-300" />
              </div>
              <h3 className="text-[18px] font-bold text-[#101828]">{activeTab} Section</h3>
              <p className="text-gray-400 text-[14px]">This section is coming soon as part of your detailed analysis.</p>
            </div>
          </div>
        )}
      </div>

      <TargetBandPrompt
        isOpen={showTargetPrompt}
        onClose={() => setShowTargetPrompt(false)}
        score={data?.overall_band != null ? parseFloat(data.overall_band).toFixed(1) : null}
        title="What's your target band?"
      />
    </div>
  );
};

export default ReportView;
