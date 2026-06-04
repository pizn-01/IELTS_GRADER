import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, Download, Eye, ArrowLeft, CheckCircle, XCircle, AlertTriangle, TrendingDown, TrendingUp, X, Bell, User, Shield, CircleDollarSign, HelpCircle, LogOut, Info } from 'lucide-react';

const ReportView = ({ onBack, data, showHeader = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [expandedSections, setExpandedSections] = useState({
    taskResponse: true,
    errorAnalysis: true,
    dualAssessment: [0, 1], // Indices of expanded sections
    vocabulary: [0], // Indices of expanded sections
    trendVerbs: true,
    introAnalysis: true,
    dataCoverageMap: true,
    flowParagraph: true,
    logicalIssues: true
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
  const profileRef = useRef(null);

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

  // Use provided data or fallback to defaults
  const essayContent = data?.essay || "Some people argue that imposing longer prison sentences is the most effective way to reduce crime, while others believe that alternative measures can achieve better results. Although stricter punishments may deter certain offenders, I believe that addressing the root causes of crime is a more sustainable and effective solution.";
  const taskTitle = data ? `${data.examType} ${data.taskType}` : "Task 2- Academic";
  const taskQuestion = data?.taskQuestion || "Task : Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.";

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
        <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 z-[100] h-[56px] flex items-center px-[40px]">
          <div className="w-full max-w-[1340px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-[18px] md:text-[20px] tracking-tight text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>IELTSGRADER</div>
              <div className="h-6 w-px bg-[#E5E7EB]"></div>

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
              {/* Credits Pill */}
              <div className="bg-[#DDF2FF] rounded-full px-4 py-1.5 flex items-center gap-3 text-left">
                <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="14"
                      cy="14"
                      r="12"
                      stroke="#C7E3F9"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="12"
                      stroke="#1A96F3"
                      strokeWidth="2.5"
                      strokeDasharray="75.4"
                      strokeDashoffset="30.16"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[12px] font-semibold text-[#101828]">Weekly Sprint</span>
                  <span className="text-[12px] font-bold text-[#101828]">Credits: 3/5 Remaining</span>
                </div>
              </div>

              <button className="text-[#94A3B8] hover:text-[#64748B] transition-colors">
                <Bell size={22} fill="currentColor" />
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 bg-[#0F172A] text-white rounded-[12px] flex items-center justify-center text-[14px] font-bold shadow-sm overflow-hidden hover:opacity-90 transition-all leading-none"
                >
                  <span className="translate-y-[0.5px]">JD</span>
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-[20px] border border-gray-100 shadow-xl z-[100] py-2 animate-in fade-in zoom-in duration-200 origin-top-right text-left">
                    {/* Arrow */}
                    <div className="absolute -top-[6px] right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45"></div>

                    {/* User Info Section */}
                    <div className="px-6 py-5 flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#2C3E50] rounded-full flex items-center justify-center text-white text-[18px] font-bold overflow-hidden shrink-0 leading-none">
                        <span className="translate-y-[1px]">JD</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[16px] font-bold text-[#101828] truncate">John Doe</span>
                        <span className="text-[14px] text-gray-400 truncate">johndoe@gmail.com</span>
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
          <div className="flex items-center justify-between mb-[6px]">
            {/* Title Row */}
            <div className="flex items-center gap-[10px]">
              <button
                onClick={onBack}
                className="w-[24px] h-[24px] border-[2px] border-[#101828] rounded-full flex items-center justify-center shrink-0 hover:bg-[#10182810] transition-all"
              >
                <ArrowLeft size={12} strokeWidth={3} className="text-[#101828]" />
              </button>
              <div className="flex items-center">
                <h1 className="text-[20px] font-bold text-[#101828] leading-none">{taskTitle}</h1>
                <span className="text-[#101828] opacity-30 font-normal mx-2 text-[20px] leading-none">.</span>
                <h1 className="text-[20px] font-bold text-[#101828] leading-none">Mar 23, 2026</h1>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-[12px]">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="bg-transparent border border-[#1018281A] rounded-[8px] px-[18px] py-[8px] text-[14px] font-medium text-[#101828] hover:bg-white/10 transition-all"
              >
                View Exam
              </button>
              <button className="bg-[#1a1f36] text-white rounded-[8px] px-[18px] py-[8px] text-[14px] font-semibold hover:bg-[#2d3a4a] transition-all border-none">
                Export Report
              </button>
            </div>
          </div>

          {/* Subtitle Row */}
          <div className="mb-[16px] flex items-center gap-1">
            <span className="text-[13px] font-semibold text-[#101828]">Overall Band Score</span>
            <span className="text-[13px] font-semibold text-[#101828]">{data?.overall_band ?? 7.0}</span>
          </div>

          {/* Tab Bar Navigation */}
          <div className="flex items-center gap-[28px] border-b border-[#D1D5DB66]">
            {["Overview", "Error Analysis", "Dual Assessment", "Model Answer", "Vocabulary", "Grammar", "Data Structure", "Flow & Logic"].map((tab) => (
              <div
                key={tab}
                className="relative pb-[12px] cursor-pointer group"
                onClick={() => setActiveTab(tab)}
              >
                <span className={`text-[14px] transition-all ${activeTab === tab ? "text-[#101828] font-bold" : "text-[#101828] font-semibold hover:text-[#000000]"}`}>
                  {tab}
                </span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B82F6]"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3 — PAGE CONTENT (white) */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-[32px] bg-white">
        {activeTab === "Overview" ? (
          <div className="space-y-6">
              <div className="space-y-6">
                <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-10 py-6 border-b border-gray-100">
                    <h3 className="text-[16px] font-bold text-[#101828]">Criteria Breakdown</h3>
                  </div>
                  <div className="py-14 px-12 flex items-center gap-[216px]">
                    <div className="flex-shrink-0 pl-4">
                      <div className="flex flex-col items-center">
                        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="65" cy="65" r="58" stroke="#F0F7FF" strokeWidth="10" fill="transparent" />
                            <circle cx="65" cy="65" r="58" stroke="#1A96F3" strokeWidth="10" fill="transparent" strokeDasharray="364.42" strokeDashoffset={364.42 * (1 - ((data?.overall_band ?? 6.5) - 1) / 8)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-[42px] font-bold text-[#1A96F3] tracking-tight">{data?.overall_band ?? 6.5}</span></div>
                        </div>
                        <span className="text-[14px] font-bold text-[#101828] whitespace-nowrap mt-4">Overall Band Score</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-6 pl-8 pr-12">
                      {[
                        { label: "Task Response", score: data?.response_band ?? 5.5, color: (data?.response_band ?? 5.5) >= 7 ? "#00C9B1" : (data?.response_band ?? 5.5) >= 5.5 ? "#FF9F00" : "#EF4444" },
                        { label: "Coherence & Cohesion", score: data?.coherence_band ?? 7.0, color: (data?.coherence_band ?? 7.0) >= 7 ? "#00C9B1" : (data?.coherence_band ?? 7.0) >= 5.5 ? "#FF9F00" : "#EF4444" },
                        { label: "Lexical Resource", score: data?.vocabulary_band ?? 6.5, color: (data?.vocabulary_band ?? 6.5) >= 7 ? "#00C9B1" : (data?.vocabulary_band ?? 6.5) >= 5.5 ? "#FF9F00" : "#EF4444" },
                        { label: "Grammatical Range & Accuracy", score: data?.grammar_band ?? 6.5, color: (data?.grammar_band ?? 6.5) >= 7 ? "#00C9B1" : (data?.grammar_band ?? 6.5) >= 5.5 ? "#FF9F00" : "#EF4444" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between w-full">
                          <span className="text-[14px] text-[#101828] font-bold">{item.label}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-[14px] text-[#101828] font-normal w-8 text-right">{item.score}</span>
                            <div className="h-[10px] w-[280px] bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${((item.score - 1) / 8) * 100}%`, backgroundColor: item.color }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-6 border-b border-gray-100">
                    <h3 className="text-[16px] font-bold text-[#101828]">Scoring Details</h3>
                    <p className="text-[13px] text-[#101828] opacity-60 mt-1">Base, seiling, and penalty breakdown</p>
                  </div>
                  <div className="p-10 space-y-6">
                    <div className="bg-[#F3F4F6] rounded-[14px] px-8 py-5 grid grid-cols-[2fr,repeat(7,1fr)] text-[13px] font-medium">
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
                      {[
                        { name: "Task Response", base: "5", ceiling: "5.5", final: "5.5", color: "#F59E0B", major: "8", high: "5", med: "-", low: "-" },
                        { name: "Coherence & Cohesion", base: "8", ceiling: "7", final: "7", color: "#10B981", major: "-", high: "-", med: "2", low: "-" },
                        { name: "Lexical Resource", base: "6.5", ceiling: "6.5", final: "6.5", color: "#10B981", major: "-", high: "3", med: "6", low: "2" },
                        { name: "Grammatical Range & Accuracy", base: "7", ceiling: "6.5", final: "6.5", color: "#10B981", major: "-", high: "1", med: "-", low: "-" }
                      ].map((row, i) => (
                        <div key={i} className="px-8 py-3 grid grid-cols-[2fr,repeat(7,1fr)] items-center text-[14px] hover:bg-gray-50 transition-colors">
                          <div className="text-[#101828] font-medium whitespace-nowrap">{row.name}</div>
                          <div className="text-center text-[#101828] font-medium">{row.base}</div>
                          <div className="text-center text-[#101828] font-medium">{row.ceiling}</div>
                          <div className="text-center font-medium" style={{ color: row.color }}>{row.final}</div>
                          <div className="text-center text-[#101828] font-medium">{row.major === "-" ? <span className="opacity-40">-</span> : row.major}</div>
                          <div className="text-center text-[#101828] font-medium">{row.high === "-" ? <span className="opacity-40">-</span> : row.high}</div>
                          <div className="text-center text-[#101828] font-medium">{row.med === "-" ? <span className="opacity-40">-</span> : row.med}</div>
                          <div className="text-center text-[#101828] font-medium">{row.low === "-" ? <span className="opacity-40">-</span> : row.low}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100">
                      <h3 className="text-[16px] font-bold text-[#101828] mb-1">Strengths</h3>
                      <p className="text-[14px] text-gray-500">What you did well</p>
                    </div>
                    <div className="p-8"><ul className="space-y-5">{(data?.strengths || ["Clear introduction identifying chart type and subject", "Logical body structure organized by age group", "Effective use of cohesive devices and linking words", "Good paragraphing with unified topic focus"]).map((text, i) => (<li key={i} className="flex items-start gap-4"><div className="mt-1 text-[#00C9B1]"><TrendingUp size={20} /></div><span className="text-[14px] text-[#101828] font-medium leading-relaxed">{text}</span></li>))}</ul></div>
                  </div>
                  <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100">
                      <h3 className="text-[16px] font-bold text-[#101828] mb-1">Weaknesses</h3>
                      <p className="text-[14px] text-gray-500">Areas for improvement</p>
                    </div>
                    <div className="p-8"><ul className="space-y-5">{(data?.weaknesses || ["Data accuracy issues — numerical values don't match reference", "Coverage gaps — misses key features from the reference chart", "Limited sentence variety (predominantly simple/compound)", "Basic comparative phrasing rather than precise quantified comparisons"]).map((text, i) => (<li key={i} className="flex items-start gap-4"><div className="mt-1 text-[#FF4D4D]"><TrendingDown size={20} /></div><span className="text-[14px] text-[#101828] font-medium leading-relaxed">{text}</span></li>))}</ul></div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: "taskResponse",
                      title: "Task Response",
                      band: "7",
                      items: [
                        { label: "Coverage", score: "4.0", text: "Both views and the writer's opinion are addressed, as demonstrated by some people think that AI will replace most human workers... others believe that AI will actually create new kinds of jobs,", style: "bg-[#FFF5F5] text-[#EA4335] border-[#EA4335]" },
                        { label: "Position", score: "5.0", text: "Opinion is clear and maintained throughout, as demonstrated by In my opinion, although AI may remove some jobs, it will also create new opportunities for workers.", style: "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]" },
                        { label: "Development", score: "5.0", text: 'While examples are given for both sides, some points lack detailed explanation or specific examples for example, For example, in factories many robots already do the work that workers used to do before. 4 issues detected: "do not need rest, salary" -> "do not need rest, salaries,"; "it can cause economic problems" -> "this can cause economic problems".', style: "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]" },
                        { label: "Relevance", score: "6.0", text: "All content is focused on the prompt, as demonstrated by Furthermore, AI can help workers do their job more efficiently instead of fully replacing them.", style: "bg-[#E6FFFA] text-[#00C9B1] border-[#00C9B1]" },
                        { label: "Conclusion", score: "7.0", text: "Conclusion summarises both views and the opinion, as demonstrated by In conclusion, although artificial intelligence may cause some unemployment in certain sectors, it can also generate new job opportunities and improve productivity.", style: "bg-[#E6FFFA] text-[#00C9B1] border-[#00C9B1]" }
                      ]
                    },
                    {
                      id: "coherenceCohesion",
                      title: "Coherence & Cohesion",
                      band: "7.0",
                      items: []
                    },
                    {
                      id: "lexicalResource",
                      title: "Lexical Resource",
                      band: "6.5",
                      items: []
                    },
                    {
                      id: "grammaticalRange",
                      title: "Grammatical Range & Accuracy",
                      band: "6.5",
                      items: []
                    }
                  ].map((section, idx) => {
                    const isExpanded = expandedSections[section.id];
                    return (
                      <div key={idx} className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
                        <div 
                          className="px-8 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleSection(section.id)}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[16px] font-bold text-[#101828]">{section.title}</span>
                            <span className="inline-flex items-center justify-center bg-[#E6FFFA] text-[#00C9B1] border border-[#B2F5EA] text-[12px] font-bold px-4 py-1.5 rounded-full uppercase leading-none">Band {section.band}</span>
                          </div>
                          <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                        {isExpanded && (
                          <div className="border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            {section.items.map((item, i) => (
                              <div key={i} className="px-8 py-5 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-[14px] font-normal text-[#101828]">{item.label}</span>
                                  <span className={`${item.style} inline-flex items-center justify-center border-[1px] text-[12px] font-medium px-2.5 py-0.5 rounded-full uppercase leading-none`}>BAND {item.score}</span>
                                </div>
                                <p className="text-[13px] text-[#101828] leading-relaxed font-normal">{item.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        ) : activeTab === "Error Analysis" ? (() => {
          const errors = data?.errors || [];
          const majorCount = errors.filter(e => e.severity === 'Major').length;
          const highCount  = errors.filter(e => e.severity === 'High').length;
          const medCount   = errors.filter(e => e.severity === 'Medium').length;
          // Sub-category aggregation
          const subCatMap = {};
          errors.forEach(e => { subCatMap[e.sub_category] = (subCatMap[e.sub_category] || 0) + 1; });
          const subCats = Object.entries(subCatMap).sort((a,b) => b[1]-a[1]);
          const maxSubCat = subCats[0]?.[1] || 1;
          return (
          <div className="space-y-8">
            {/* Header Info Cards */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Total Errors", count: String(errors.length), color: "text-[#00C9B1]" },
                { label: "Major", count: String(majorCount), color: "text-[#EA4335]" },
                { label: "High Severity", count: String(highCount), color: "text-[#F59E0B]" },
                { label: "Medium", count: String(medCount), color: "text-[#1A96F3]" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-[16px] p-6 border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="text-[12px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{item.label}</p>
                    <p className={`text-[28px] font-black ${item.color}`}>{item.count}</p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-full text-gray-400">
                    <Info size={24} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>

            {/* Errors by Sub-Category */}
            <div className="bg-white rounded-[8px] p-8 border border-[#E5E7EB] shadow-sm">
              <h3 className="text-[15px] font-bold text-[#101828] mb-8">Errors by Sub-Category</h3>
              {subCats.length === 0 ? (
                <p className="text-[14px] text-gray-400">No errors detected.</p>
              ) : (
              <div className="space-y-5">
                {subCats.map(([label, count], idx) => (
                  <div key={idx} className="flex items-center">
                    <span className="text-[13px] font-medium text-[#475467] w-[240px] shrink-0">{label}</span>
                    <div className="flex-1 flex items-center gap-8">
                      <span className="text-[13px] font-bold text-[#101828] w-6">{count}</span>
                      <div className="h-[10px] flex-1 bg-[#F2F4F7] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A96F3] rounded-full" style={{ width: `${(count / maxSubCat) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Detailed Error Breakdown — Unified Box */}
            <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div 
                className="px-8 py-6 border-b border-[#E5E7EB] flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('errorAnalysis')}
              >
                <h3 className="text-[16px] font-bold text-[#101828]">Detailed Error Breakdown</h3>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.errorAnalysis ? "rotate-180" : ""}`} />
              </div>

              {expandedSections.errorAnalysis && (
                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-200">
                  {errors.length === 0 && (
                    <p className="text-[14px] text-gray-400 text-center py-8">No errors detected in this submission.</p>
                  )}
                  {errors.map((rawError, _ei) => {
                    const error = { id: String(_ei + 1), title: rawError.title, severity: rawError.severity, criteria: rawError.criteria, sub: rawError.sub_category, loc: rawError.location_text, original: rawError.original_text, correction: rawError.correction_text, explanation: rawError.explanation };
                    return (
                    <div key={error.id} className="rounded-[12px] border border-[#E5E7EB] overflow-hidden bg-[#F9FAFB]/30">
                      {/* Error Header */}
                      <div className="px-6 py-4 flex items-center justify-between border-b border-[#E5E7EB] bg-white">
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] font-bold text-[#101828]">
                            #{error.id}
                          </span>
                          <h4 className="text-[16px] font-bold text-[#101828]">{error.title}</h4>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold border ${
                          error.severity === "Major" 
                            ? "text-[#EF4444] border-[#FEE2E2] bg-[#FFF5F5]" 
                            : "text-[#F59E0B] border-[#FEF3C7] bg-[#FFFBEB]"
                        }`}>
                          {error.severity.toUpperCase()}
                        </span>
                      </div>

                      {/* Metadata Row */}
                      <div className="px-6 py-3 flex flex-wrap items-center gap-x-10 gap-y-2 border-b border-[#E5E7EB] bg-white/50">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Criteria</span>
                          <span className="text-[13px] font-bold text-[#101828] bg-gray-100 px-2 py-0.5 rounded">{error.criteria}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Sub-Category</span>
                          <span className="text-[13px] font-bold text-[#101828] bg-gray-100 px-2 py-0.5 rounded">{error.sub}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Location</span>
                          <span className="text-[13px] font-bold text-[#101828] bg-gray-100 px-2 py-0.5 rounded">{error.loc}</span>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-white rounded-[10px] p-5 border border-red-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                            <p className="text-[11px] font-bold text-red-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                              <XCircle size={14} /> Original
                            </p>
                            <p className="text-[14px] text-[#101828] font-bold leading-relaxed italic">"{error.original}"</p>
                          </div>
                          <div className="bg-white rounded-[10px] p-5 border border-emerald-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                            <p className="text-[11px] font-bold text-emerald-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                              <CheckCircle size={14} /> Correction
                            </p>
                            <p className="text-[14px] text-[#101828] font-bold leading-relaxed">{error.correction}</p>
                          </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-[10px] p-5 border border-blue-100">
                           <p className="text-[11px] font-bold text-blue-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                             <Info size={14} /> AI Explanation
                           </p>
                           <p className="text-[14px] text-[#475467] leading-relaxed font-medium">
                            {error.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
          );
        })() : activeTab === "Dual Assessment" ? (
          <div className="space-y-6">
            {[
              {
                title: "Task Response",
                avg: "5.5",
                gpt4: "5.0",
                gpt5: "6.0",
                summary: "The report describes general trends and makes some comparisons, but the data is almost entirely invented and does not reflect the actual chart.",
                subScores: [
                  { cat: "Development", avg: "5.0", strength: "Attempts to support trend statements with quantitative data", weakness: "All supporting data is inaccurate and not drawn from the actual chart" },
                  { cat: "Comparison", avg: "5.5", strength: "Makes comparisons between genders and age groups", weakness: "Comparisons based on incorrect data" },
                  { cat: "Relevance", avg: "6.0", strength: "No opinions or external information; focused on the chart", weakness: "Content describes a different dataset entirely" },
                  { cat: "Coverage", avg: "5.0", strength: "Mentions all age and gender groups", weakness: "Misses all actual key features from the reference chart" },
                  { cat: "Data Accuracy", avg: "3.5", strength: "Attempts to provide specific figures for each group", weakness: "All numerical values are fabricated" },
                  { cat: "Overview/Position", avg: "5.5", strength: "Provides a clear summary of main trends", weakness: "Summarizes invented information, not real data" }
                ]
              },
              {
                title: "Coherence & Cohesion",
                avg: "7.0",
                gpt4: "8.0",
                gpt5: "6.0",
                summary: "The report is well-organised with a clear introduction, overview, and logical body structure. Paragraphing is effective and data flows smoothly.",
                subScores: [
                  { cat: "Cohesive Devices", avg: "7.5", strength: "Linking words used appropriately and not overused", weakness: "Some repetition of basic linkers" },
                  { cat: "Structure", avg: "6.5", strength: "Clear introduction, overview, and body", weakness: "Overview could be more distinct" },
                  { cat: "Referencing", avg: "8.0", strength: "Pronouns and references always clear", weakness: "No significant weaknesses" },
                  { cat: "Paragraphing", avg: "8.0", strength: "Paragraphs unified and each covers a single data group", weakness: "Topic sentences could be more explicit" },
                  { cat: "Progression", avg: "7.5", strength: "Logical order from children to adults", weakness: "Transitions functional but lack sophistication" }
                ]
              }
            ].map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-[16px] border border-[#D1D5DB] shadow-sm overflow-hidden">
                <div 
                  className="px-10 py-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleSection('dualAssessment', sIdx)}
                >
                  <h3 className="text-[16px] font-bold text-[#101828]">{section.title}</h3>
                  <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.dualAssessment.includes(sIdx) ? "rotate-180" : ""}`} />
                </div>

                {expandedSections.dualAssessment.includes(sIdx) && (
                  <div className="px-10 pb-10 border-t border-[#E5E7EB] pt-10 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Score Header */}
                    <div className="flex items-center border border-[#E5E7EB] rounded-[12px] overflow-hidden mb-8">
                      <div className="w-[100px] h-[100px] border-r border-[#E5E7EB] flex items-center justify-center bg-white">
                        {(() => {
                          const val = parseFloat(section.avg);
                          const color = val >= 7.0 ? "text-[#30C3A9]" : "text-[#F59E0B]";
                          return (
                            <span className={`text-[32px] font-bold ${color}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
                              {section.avg}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex-1 flex items-center justify-around px-10 bg-white">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[16px] font-medium text-gray-400" style={{ fontFamily: "'Nunito', sans-serif" }}>gpt-4.1:</span>
                          <span className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{section.gpt4}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[16px] font-medium text-gray-400" style={{ fontFamily: "'Nunito', sans-serif" }}>gpt-5-mini:</span>
                          <span className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{section.gpt5}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[15px] text-[#475467] leading-relaxed mb-10 px-0" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {section.summary}
                    </p>

                    {/* Sub-Category Scores Table */}
                    <div className="space-y-5">
                      <h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Sub Category Scores</h4>
                      <div className="overflow-hidden border border-[#E5E7EB] rounded-[12px]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[#F9FAFB] text-[14px] font-bold text-[#101828]">
                              <th className="px-6 py-4">Sub Category</th>
                              <th className="px-6 py-4">Avg</th>
                              <th className="px-6 py-4">Strength</th>
                              <th className="px-6 py-4">Weakness</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F2F4F7]">
                            {section.subScores.map((row, rIdx) => {
                              const scoreVal = parseFloat(row.avg);
                              let scoreColor = "text-[#F59E0B]"; // Default orange
                              if (scoreVal >= 6.0) scoreColor = "text-[#30C3A9]"; // Updated teal
                              if (scoreVal < 5.0) scoreColor = "text-[#EF4444]"; // Red

                              return (
                                <tr key={rIdx} className="text-[14px] hover:bg-gray-50/50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{row.cat}</td>
                                  <td className={`px-6 py-4 font-bold ${scoreColor}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{row.avg}</td>
                                  <td className="px-6 py-4 text-[#475467] leading-relaxed font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{row.strength}</td>
                                  <td className="px-6 py-4 text-[#475467] leading-relaxed font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{row.weakness}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {["Lexical Resource", "Grammatical Range & Accuracy"].map((title, i) => (
              <div key={i} className="bg-white rounded-[16px] border border-[#D1D5DB] shadow-sm overflow-hidden">
                <div className="px-10 py-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <h3 className="text-[16px] font-bold text-[#101828]">{title}</h3>
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "Model Answer" ? (() => {
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
              <div className="px-10 py-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-[#101828]">Improved Report</h3>
                  <p className="text-[13px] text-gray-400 mt-0.5">Word count: {wordCount}</p>
                </div>
                <div className="bg-[#ECFDF5] text-[#10B981] px-4 py-1.5 rounded-full text-[12px] font-black tracking-tight border border-[#D1FAE5]">
                  BAND {ma.estimated_band ?? 8.0}
                </div>
              </div>
              <div className="p-10">
                <div className="bg-[#F0FDF4] rounded-[16px] p-10 border border-[#DCFCE7]">
                  <h4 className="text-[14px] font-bold text-[#101828] mb-6 uppercase tracking-wider">Revised Report</h4>
                  <p className="text-[15px] text-[#101828] leading-[1.8] font-semibold whitespace-pre-wrap">{ma.text}</p>
                </div>
              </div>
            </div>

            {ma.key_changes && ma.key_changes.length > 0 && (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-10 py-6 border-b border-gray-100">
                <h3 className="text-[16px] font-bold text-[#101828]">Key Improvements Made</h3>
                <p className="text-[13px] text-gray-400 mt-0.5">Changes from the original to the improved version</p>
              </div>
              <div className="p-10">
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
                <div className="px-10 py-6 border-b border-[#E5E7EB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => toggleSection('vocabulary', catIdx)}>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#101828]">{cat.name}</h3>
                    {cat.description && <p className="text-[14px] text-[#101828] mt-1 font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{cat.description}</p>}
                  </div>
                  <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </div>
                {isOpen && (
                  <div className="p-10 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    {(cat.words || []).map((item, idx) => (
                      <div key={idx} className="bg-white border border-[#D1D5DB] rounded-[12px] overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#E5E7EB]">
                          <h4 className="text-[14px] font-bold text-[#101828]">{item.word}</h4>
                        </div>
                        <div className="p-8 space-y-6">
                          <p className="text-[16px] text-[#101828] leading-none font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.definition}</p>
                          <div className="w-full h-[49px] bg-[#1018280D] rounded-[10px] px-6 text-[16px] text-[#101828] font-semibold border border-[#10182826] leading-none flex items-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {item.example}
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
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden px-6 h-[185px] flex flex-col justify-center">
              <h3 className="text-[18px] font-bold text-[#101828] mb-3 leading-[20px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Overview</h3>
              <div className="space-y-2">
                <p className="text-[15px] text-[#101828] leading-[1.1] font-semibold line-clamp-2 overflow-hidden tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <span className="font-bold">Strengths:</span> {ga.overview_strengths || '—'}
                </p>
                <p className="text-[15px] text-[#101828] leading-[1.1] font-semibold line-clamp-2 overflow-hidden tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <span className="font-bold">Weaknesses:</span> {ga.overview_weaknesses || '—'}
                </p>
              </div>
            </div>

            {/* Grammatical Structures Used */}
            <div className="bg-white rounded-[24px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div className="px-10 py-6 border-b border-[#E5E7EB]">
                <h3 className="text-[16px] font-bold text-[#101828]">Grammatical Structures Used</h3>
                <p className="text-[13px] text-gray-400 mt-0.5">Structures identified in the report</p>
              </div>
              <div className="p-10">
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
              <div className="px-8 py-5 border-b border-[#E5E7EB]">
                <h3 className="text-[18px] font-bold text-[#101828] leading-[20px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Suggested Grammatical Enrichments</h3>
                <p className="text-[16px] text-[#475467] mt-2 leading-none font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>Techniques to boost your grammar score</p>
              </div>

              <div className="p-8 space-y-10">
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
              <div className="px-8 py-5 border-b border-[#E5E7EB]">
                <h3 className="text-[18px] font-bold text-[#101828] leading-[20px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Expert Tips</h3>
              </div>
              <div className="p-8">
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
        : activeTab === "Data Structure" ? (() => {
          const dsa = data?.data_structure_analysis;
          if (!dsa) return (
            <div className="bg-white rounded-[24px] p-20 flex items-center justify-center border border-gray-100 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto"><FileText className="text-gray-300" /></div>
                <h3 className="text-[18px] font-bold text-[#101828]">Data Structure Analysis</h3>
                <p className="text-gray-400 text-[14px]">Data structure analysis is being generated. Please check back shortly.</p>
              </div>
            </div>
          );
          return (
          <div className="space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden pl-[32px] pr-[48px] py-6 flex flex-col justify-center">
              <h3 className="text-[18px] font-bold text-[#101828] mb-3 leading-[20px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Overview</h3>
              <p className="text-[16px] text-[#101828] leading-snug font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {dsa.overview}
              </p>
            </div>

            {/* Introduction Analysis */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div 
                className="px-[32px] py-5 border-b border-[#D1D5DB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleSection('introAnalysis')}
              >
                <h3 className="text-[16px] font-bold text-[#101828]">Introduction Analysis</h3>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.introAnalysis ? "rotate-180" : ""}`} />
              </div>

              {expandedSections.introAnalysis && (
                <div className="px-[32px] py-[24px] space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Status Tags */}
                <div className="flex items-center gap-10">
                  <div className="text-[13px]">
                    <span className="text-[#475467] font-medium">Paraphrase:</span> <span className="font-bold text-[#101828] ml-1">Partial</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#101828] font-semibold">
                    <CheckCircle size={18} strokeWidth={2.5} className="text-[#26C1A1]" />
                    <span>Chart Type</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#101828] font-semibold">
                    <XCircle size={18} strokeWidth={2.5} className="text-[#FF5E4D]" />
                    <span>Time Period</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#101828] font-semibold">
                    <CheckCircle size={18} strokeWidth={2.5} className="text-[#26C1A1]" />
                    <span>Units</span>
                  </div>
                </div>

                {/* Text Box */}
                <div 
                  className="w-full max-w-[1280px] h-[49px] bg-[#1018280D] border border-[#10182833] rounded-[10px] px-6 flex items-center text-[16px] text-[#101828] font-semibold leading-none whitespace-nowrap overflow-hidden"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  The bar chart illustrates the average calorie intake for males and females in three age groups: children, adolescents and adults, measured in kilocalories.
                </div>

                {/* Strengths and Weaknesses */}
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-[16px] font-bold text-[#00C9B1]">Strengths</h4>
                    <ul className="space-y-4">
                      {["Clearly identifies it is a bar chart", "States the measurement unit (kilocalories)", "Introduces the compared groups (males vs females; three age groups)"].map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-[7px] shrink-0" />
                          <span className="text-[14px] text-[#101828] font-semibold leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[16px] font-bold text-[#FF4D4D]">Weakness</h4>
                    <ul className="space-y-4">
                      {["Does not reflect the prompt's framing (age and gender across categories/timeframes)", "No time period is identified (reference data is year-based: 2000/2010/2020)", "Adds specific category labels that do not match the given series-based dataset"].map((w, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-[7px] shrink-0" />
                          <span className="text-[14px] text-[#101828] font-semibold leading-relaxed">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-5 text-[14px] leading-relaxed">
                  <span className="font-bold text-[#00C9B1]">Recommendation:</span> <span className="text-[#101828] font-semibold ml-1">Paraphrase the prompt in a chart-faithful way by naming the series and timeframe shown, plus the unit exactly as given.</span>
                </div>
              </div>
              )}
            </div>

            {/* Data Coverage Map */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div 
                className="px-[32px] py-6 border-b border-[#D1D5DB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleSection('dataCoverageMap')}
              >
                <h3 className="text-[16px] font-bold text-[#101828]">Data Coverage Map</h3>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.dataCoverageMap ? "rotate-180" : ""}`} />
              </div>

              {expandedSections.dataCoverageMap && (
                <div className="px-[32px] py-[24px] space-y-8 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Table Section */}
                <div className="overflow-hidden">
                  <table className="w-full text-left border-b border-[#D1D5DB]">
                    <thead>
                      <tr className="bg-[#F2F4F7] rounded-[8px]">
                        <th className="px-6 py-4 text-[14px] font-bold text-[#101828] rounded-l-[8px]">Data Series</th>
                        <th className="px-6 py-4 text-[14px] font-bold text-[#101828] text-center">Status</th>
                        <th className="px-6 py-4 text-[14px] font-bold text-[#101828]">Evidence Quality</th>
                        <th className="px-6 py-4 text-[14px] font-bold text-[#101828] text-center rounded-r-[8px]">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D1D5DB]">
                      {[
                        { series: "Series A (2000, 2010, 2020)", status: "Missing", quality: "No chart-based figures or year references are given for Series A", score: "2" },
                        { series: "Series B (2000, 2010, 2020)", status: "Missing", quality: "No chart-based figures or year references are given for Series B", score: "2" }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-5 text-[14px] font-medium text-[#101828]">{row.series}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-center gap-2 text-[14px] text-[#FF5E4D] font-semibold">
                              <XCircle size={23} strokeWidth={2} />
                              <span>{row.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-[14px] text-[#475467] font-normal leading-relaxed">{row.quality}</td>
                          <td className="px-6 py-5 text-center text-[14px] font-bold text-[#FF5E4D]">{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Analysis */}
                <div className="space-y-10">
                  {/* Series A Details */}
                  <div className="space-y-5">
                    <h4 className="text-[16px] font-bold text-[#101828]">Series A (2000, 2010, 2020)</h4>
                    <ul className="space-y-4">
                      {[
                        "Values for Series A in 2000, 2010 and 2020 (213, 253, 303 units)",
                        "Trend description across the three years (steady increase)",
                        "Direct comparisons with Series B in each year (e.g., which series is higher)"
                      ].map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#EA4335] mt-[7px] shrink-0" />
                          <span className="text-[16px] text-[#EA4335] font-semibold leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="bg-[#30C3A926] border border-[#30C3A926] rounded-[10px] p-5 text-[15.5px] leading-relaxed">
                      <span className="font-bold text-[#00C9B1]">Recommendation:</span> <span className="text-[#101828] font-bold ml-1">Add a paragraph tracking Series A over time with approximate values and trend direction, then compare against Series B for at least two points (start/end).</span>
                    </div>
                  </div>

                  {/* Series B Details */}
                  <div className="space-y-5">
                    <h4 className="text-[16px] font-bold text-[#101828]">Series B (2000, 2010, 2020)</h4>
                    <ul className="space-y-4">
                      {[
                        "Values for Series B in 2000, 2010 and 2020 (243, 223, 333 units)",
                        "Non-linear pattern (dip in 2010 then sharp rise to 2020)",
                        "Comparison with Series A (B higher in 2000 and 2020; lower in 2010)"
                      ].map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#EA4335] mt-[7px] shrink-0" />
                          <span className="text-[16px] text-[#EA4335] font-semibold leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="bg-[#30C3A926] border border-[#30C3A926] rounded-[10px] p-5 text-[15.5px] leading-relaxed">
                      <span className="font-bold text-[#00C9B1]">Recommendation:</span> <span className="text-[#101828] font-bold ml-1">Describe Series B's change across 2000–2020, highlighting the 2010 low and the sharp rise by 2020, and explicitly compare its level to Series A in each year.</span>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Collapsed Sections */}
            {[
              "Overview Analysis",
              "Data Selection Quality",
              "Task Alignment",
              "Authenticity & Natural Language"
            ].map((title, idx) => (
              <div key={idx} className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
                <div className="px-10 py-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <h3 className="text-[16px] font-bold text-[#101828]">{title}</h3>
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
          );
        })()
        : activeTab === "Flow & Logic" ? (
          <div className="space-y-6">
            {/* Overall Flow Score Card */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden px-10 py-8 flex items-center justify-between">
              <div className="space-y-1 max-w-[1000px]">
                <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Overall Flow Score</h3>
                <p className="text-[14px] text-[#101828] font-normal leading-snug whitespace-nowrap" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Coherence is strong: clear intro → overview structure, then logically sequenced body paragraphs by age group with consistent male-female comparisons.
                </p>
              </div>
              <div className="text-[32px] font-bold shrink-0" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <span className="text-[#3B82F6]">84</span><span className="text-[#101828]">/100</span>
              </div>
            </div>

            {/* Paragraph-to-Paragraph Flow */}
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div 
                className="px-8 py-4 border-b border-[#D1D5DB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleSection('flowParagraph')}
              >
                <h3 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Paragraph-to-Paragraph Flow</h3>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.flowParagraph ? "rotate-180" : ""}`} />
              </div>

              {expandedSections.flowParagraph && (
                <div className="px-8 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#F2F4F7] rounded-[8px]">
                        <th className="px-6 py-2 text-[14px] font-bold text-[#101828] rounded-l-[8px] w-[260px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Transition</th>
                        <th className="px-6 py-2 text-[14px] font-bold text-[#101828] w-[140px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Strength</th>
                        <th className="px-6 py-2 text-[14px] font-bold text-[#101828] w-[160px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Quality</th>
                        <th className="px-6 py-2 text-[14px] font-bold text-[#101828] rounded-r-[8px]" style={{ fontFamily: "'Nunito', sans-serif" }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D1D5DB]">
                      {[
                        { trans: "Cohesive Devices", score: "90", quality: "Smooth", color: "text-[#30C3A9]", qColor: "text-[#30C3A9]", note: "The introduction identifies the chart subject (calorie intake by gender and age group), so moving to an overview of main patterns is a natural next step." },
                        { trans: "Structure", score: "85", quality: "Smooth", color: "text-[#30C3A9]", qColor: "text-[#30C3A9]", note: "The overview establishes broad comparisons (males higher; children lowest), and Body 1 logically begins detailing the first age group (child)" },
                        { trans: "Referencing", score: "82", quality: "Smooth", color: "text-[#30C3A9]", qColor: "text-[#30C3A9]", note: "After quantifying the lowest group (children), the report progresses to the next age group (adolescents) and signals it as the highest intake group." },
                        { trans: "Paragraphing", score: "75", quality: "Adequate", color: "text-[#30C3A9]", qColor: "text-[#F59E0B]", note: "Add a brief wrap-up clause before the summary, e.g., 'Having compared all three age brackets, ...' or ensure the final sentence explicitly references all groups." }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-1.5 text-[16px] font-normal text-[#101828] whitespace-nowrap leading-none tracking-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>{row.trans}</td>
                          <td className={`px-6 py-1.5 text-[14px] font-bold ${row.color}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{row.score}</td>
                          <td className={`px-6 py-1.5 text-[14px] font-bold ${row.qColor}`} style={{ fontFamily: "'Nunito', sans-serif" }}>{row.quality}</td>
                          <td className="px-6 py-1.5 text-[14px] text-[#101828] font-normal leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>

            {/* Logical Issues Detected */}
            <div className="bg-white rounded-[12px] border border-[#D1D5DB] shadow-sm overflow-hidden">
              <div 
                className="px-8 py-3 border-b border-[#E5E7EB] flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleSection('logicalIssues')}
              >
                <h3 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Logical Issues Detected</h3>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedSections.logicalIssues ? "rotate-180" : ""}`} />
              </div>

              {expandedSections.logicalIssues && (
                <div className="px-8 py-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Issue 1 */}
                <div className="space-y-5">
                  <h4 className="text-[15px] font-bold text-[#EA4335]" style={{ fontFamily: "'Nunito', sans-serif" }}>Category/Data mismatch (prompt vs report framing) — Introduction and throughout</h4>
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-[10px] p-4 text-[16px] text-[#101828] font-semibold leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    "The bar chart illustrates the average calorie intake for males and females in three age groups: children, adolescents and adults, measured in kilocalories."
                  </div>
                  <div className="space-y-1">
                    <p className="text-[14px] text-[#475467] leading-snug font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      The prompt mentions 'various categories between different groups and timeframes where applicable', implying potentially multiple categories/periods, but the report treats the visual as only three age groups by gender with no time dimension. This creates a framing mismatch that can confuse the reader about what is being grouped and compared.
                    </p>
                    <p className="text-[14px] text-[#475467] leading-snug" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#101828]">Impact:</span> Reduces coherence between task statement and description; reader may expect time/categorical breakdowns that never appear.
                    </p>
                  </div>
                  <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4">
                    <p className="text-[16px] leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#00C9B1]">Revision:</span> <span className="text-[#101828] font-normal ml-1">Align the intro with the actual chart dimensions shown (e.g., '...by age group and gender') and avoid mentioning timeframes/categories unless they are present in the chart.</span>
                    </p>
                  </div>
                </div>

                {/* Issue 2 */}
                <div className="space-y-5">
                  <h4 className="text-[15px] font-bold text-[#EA4335]" style={{ fontFamily: "'Nunito', sans-serif" }}>Grouping emphasis inconsistency (overview vs detail order) — Overview → Body paragraphs</h4>
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-[10px] p-4 text-[16px] text-[#101828] font-semibold leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    "Overall, males consume more calories than females in all age groups. In addition, adolescents have the highest calorie intake... while children consume the lowest amount."
                  </div>
                  <div className="space-y-1">
                    <p className="text-[14px] text-[#475467] leading-snug font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      The overview foregrounds the 'highest vs lowest' contrast, but the body proceeds sequentially by age (children → adolescents → adults) rather than grouping extremes together (children vs adolescents) first. This is not an error, but it slightly weakens the promised 'extremes' grouping logic.
                    </p>
                    <p className="text-[14px] text-[#475467] leading-snug" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#101828]">Impact:</span> Minor; the reader's expectation of an 'extremes comparison' is delayed until Body 2.
                    </p>
                  </div>
                  <div className="bg-[#E6FFFA] border border-[#B2F5EA] rounded-[10px] p-4">
                    <p className="text-[16px] leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#00C9B1]">Revision:</span> <span className="text-[#101828] font-normal ml-1">Either (a) keep the overview but start Body 1 with adolescents then children to mirror 'highest then lowest', or (b) adjust the overview to say the report will describe the groups in age order.</span>
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Collapsed Sections */}
            {[
              "Paragraph Unity",
              "Sentence-Level Flow",
              "Cohesive Devices"
            ].map((title, idx) => (
              <div key={idx} className="bg-white rounded-[24px] border border-[#D1D5DB] shadow-sm overflow-hidden">
                <div className="px-10 py-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <h3 className="text-[16px] font-bold text-[#101828]">{title}</h3>
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
    </div>
  );
};

export default ReportView;
