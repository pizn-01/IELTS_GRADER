import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, ChevronLeft, ChevronDown, ChevronUp, 
  ArrowUpRight, ArrowDownLeft, Download, Eye, 
  Bell, Clock, Info, CheckCircle2, MoreHorizontal
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Footer from '../components/Footer';
import GradingModal from '../components/GradingModal';

const ReportPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [openAccordion, setOpenAccordion] = useState(0);
  const [isGrading, setIsGrading] = useState(true);

  const criteriaData = [
    { name: 'Task Response', value: 5.5, color: '#F97316' },
    { name: 'Coherence & Cohesion', value: 7.0, color: '#14B8A6' },
    { name: 'Lexical Resource', value: 6.5, color: '#14B8A6' },
    { name: 'Grammatical Range & Accuracy', value: 6.5, color: '#14B8A6' },
  ];

  const donutData = [{ value: 6.5 }, { value: 2.5 }];

  const scoringDetails = [
    { criterion: 'Task Response', base: '5', ceiling: '5.5', final: '5.5', major: '8', high: '5', med: '-', low: '-' },
    { criterion: 'Coherence & Cohesion', base: '8', ceiling: '7', final: '7', major: '-', high: '-', med: '2', low: '-' },
    { criterion: 'Lexical Resource', base: '6.5', ceiling: '6.5', final: '6.5', major: '-', high: '3', med: '6', low: '2' },
    { criterion: 'Grammatical Range & Accuracy', base: '7', ceiling: '6.5', final: '6.5', major: '-', high: '1', med: '-', low: '-' },
  ];

  const strengths = [
    "Clear introduction identifying chart type and subject",
    "Logical body structure organized by age group",
    "Effective use of cohesive devices and linking words",
    "Good paragraphing with unified topic focus"
  ];

  const weaknesses = [
    "Data accuracy issues — numerical values don't match reference",
    "Coverage gaps — misses key features from the reference chart",
    "Limited sentence variety (predominantly simple/compound)",
    "Basic comparative phrasing rather than precise quantified comparisons"
  ];

  const accordions = [
    {
      title: "Task Response",
      band: "BAND 7",
      bandColor: "teal",
      items: [
        { 
          name: "Coverage", 
          score: "4.0", 
          scoreColor: "red",
          desc: "Both views and the writer's opinion are addressed, as demonstrated by some people think that AI will replace most human workers... others believe that AI will actually create new kinds of jobs."
        },
        { 
          name: "Position", 
          score: "5.5", 
          scoreColor: "orange",
          desc: "Opinion is clear and maintained throughout, as demonstrated by In my opinion, although AI may remove some jobs, it will also create new opportunities for workers."
        },
        { 
          name: "Development", 
          score: "5.0", 
          scoreColor: "orange",
          desc: "While examples are given for both sides, some points lack detailed explanation or specific examples for example. For example, in factories many robots already do the work that workers used to do before. 4 issues detected: \"do not need rest, salary\" — \"do not need rest, salaries,\" \"It can cause economic problems\" — \"this can cause economic problems\"."
        },
        { 
          name: "Relevance", 
          score: "6.0", 
          scoreColor: "orange",
          desc: "All content is focused on the prompt, as demonstrated by Furthermore, AI can help workers do their job more efficiently instead of fully replacing them."
        },
        { 
          name: "Conclusion", 
          score: "7.0", 
          scoreColor: "teal",
          desc: "Conclusion summarises both views and the opinion, as demonstrated by In conclusion, although artificial intelligence may cause some unemployment in certain sectors, it can also generate new job opportunities and improve productivity."
        }
      ]
    },
    { title: "Coherence & Cohension", band: "BAND 7.0", bandColor: "teal" },
    { title: "Lexical Resource", band: "BAND 6.5", bandColor: "orange" },
    { title: "Grammatical Range & Accuracy", band: "BAND 6.5", bandColor: "orange" }
  ];

  const getBandStyles = (color) => {
    if (color === 'teal') return 'bg-[#ccfbf1] text-[#0d9488]';
    if (color === 'orange') return 'bg-[#fef3c7] text-[#d97706]';
    return 'bg-[#fee2e2] text-[#dc2626]';
  };

  return (
    <div className="relative">
      {isGrading && <GradingModal onComplete={() => setIsGrading(false)} />}
      
      <div className={`transition-all duration-700 ${isGrading ? 'blur-md pointer-events-none overflow-hidden h-screen' : 'blur-0'}`}>
        <div className="min-h-screen bg-white font-['Inter',_sans-serif]">
          {/* 1. NAVBAR */}
          <nav className="bg-white border-b border-[#f3f4f6] md:h-[72px] flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 sticky top-0 z-50 gap-4 md:gap-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-10 w-full md:w-auto">
              <span 
                onClick={() => navigate('/')} 
                className="text-[19px] font-extrabold text-[#0f172a] tracking-tight cursor-pointer hover:opacity-80 transition-all"
              >
                IELTSGRADER
              </span>
              <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto justify-center">
                <button className="text-[13px] text-[#6b7280] hover:text-[#0f172a] transition-colors">Dashboard</button>
                <div className="relative flex flex-col items-center">
                  <button className="text-[13px] font-bold text-[#1e2a4a] py-2 md:h-[72px]">Reports</button>
                  <div className="absolute bottom-0 w-full h-[2px] bg-[#1e2a4a] hidden md:block"></div>
                </div>
                <button className="text-[13px] text-[#6b7280] hover:text-[#0f172a] transition-colors">Settings</button>
              </div>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto gap-3">
              <div className="border border-[#e5e7eb] rounded-full px-3 py-1 flex items-center gap-2.5 bg-transparent">
                <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-transparent relative" style={{ 
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #14b8a6)', 
                  backgroundOrigin: 'border-box', 
                  backgroundClip: 'content-box, border-box' 
                }}></div>
                <div>
                  <p className="text-[11px] font-bold text-[#111827] leading-tight">Weekly Sprint</p>
                  <p className="text-[10px] text-[#6b7280] leading-tight">Credits: 3/5</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-1.5 text-[#9ca3af] hover:text-[#111827] transition-colors">
                  <Bell className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 bg-[#1e2a4a] rounded-full flex items-center justify-center text-white text-[12px] font-bold">
                  JD
                </div>
              </div>
            </div>
          </nav>

          {/* 2. VERIFICATION BANNER */}
          {/* 2. VERIFICATION BANNER */}
          <div className="w-full bg-[#fef3e2] py-2.5 px-4 md:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-start sm:items-center gap-2">
              <AlertCircle className="w-[15px] h-[15px] text-[#f59e0b] shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-[12px] text-[#6b7280] font-normal leading-snug">
                We've sent a verification link to your email. Please verify to secure your account.
              </p>
            </div>
            <button className="bg-white border border-[#d1d5db] rounded-[6px] px-4 py-1.5 text-[12px] font-medium text-[#111827] hover:bg-gray-50 transition-all whitespace-nowrap self-end sm:self-auto">
              Resend Email
            </button>
          </div>

          {/* 3. PAGE HEADER */}
          <div 
            className="w-full" 
            style={{ background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 20%, #e8d5f5 50%, #dbeafe 80%, #e0f2fe 100%)' }}
          >
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-[18px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <div className="flex items-start sm:items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-[26px] h-[26px] border-[1.5px] border-[#374151] rounded-full flex items-center justify-center text-[#374151] hover:bg-white/20 transition-all mt-1 sm:mt-0 shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                <div>
                  <h1 className="text-[16px] md:text-[18px] font-bold text-[#111827] leading-snug">Task 2 - Academic . Mar 23, 2026</h1>
                  <p className="text-[13px] text-[#6b7280]">Overall Band Score <span className="text-[#111827] font-bold">7.0</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none bg-white border border-[#d1d5db] rounded-[8px] px-4 py-1.5 text-[13px] text-[#374151] hover:bg-gray-50 transition-all font-medium">
                  View Exam
                </button>
                <button className="flex-1 sm:flex-none bg-[#1e2a4a] text-white rounded-[8px] px-4 py-1.5 text-[13px] font-bold hover:opacity-90 transition-all">
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* 4. TAB NAVIGATION */}
          <div className="bg-white border-b border-[#e5e7eb] sticky top-[60px] z-40">
            <div className="max-w-[1200px] mx-auto px-8 overflow-x-auto no-scrollbar scroll-smooth">
              <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="flex items-center min-w-max">
                {['Overview', 'Error Analysis', 'Dual Assessment', 'Model Answer', 'Vocabulary', 'Grammar', 'Data Structure', 'Flow & Logic'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-[10px] mr-[28px] text-[13px] font-medium transition-all relative ${
                      activeTab === tab ? 'text-[#1e2a4a] font-bold' : 'text-[#6b7280] hover:text-[#1e2a4a]'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#1e2a4a]"></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <main className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-16 space-y-5">
            {/* CRITERIA BREAKDOWN */}
            <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 md:px-8 py-4 md:py-5 border-b border-[#f3f4f6]">
                <h2 className="text-[15px] font-bold text-[#111827]">Criteria Breakdown</h2>
              </div>
              <div className="w-full overflow-x-auto custom-scrollbar">
                <div className="px-5 md:px-8 py-6 md:py-8 flex flex-col md:flex-row items-center min-w-[300px] md:min-w-[700px]">
                  {/* Donut Chart - Left */}
                  <div className="flex flex-col items-center shrink-0 mb-8 md:mb-0 md:mr-10 lg:mr-16">
                    <div className="relative w-[120px] h-[120px] flex items-center justify-center mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} innerRadius={42} outerRadius={56} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                            <Cell fill="#3b82f6" cornerRadius={10} />
                            <Cell fill="#eff6ff" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[30px] font-bold text-[#3B82F6]">6.5</span>
                      </div>
                    </div>
                    <span className="text-[12px] font-medium text-[#374151]">Overall Band Score</span>
                  </div>

                  <div className="w-full md:w-auto flex flex-1">
                    {/* Criteria Names - Center */}
                    <div className="space-y-6 shrink-0 mr-4 md:mr-auto">
                      {criteriaData.map((item, i) => (
                        <div key={i} className="h-[10px] flex items-center">
                          <span className="text-[12px] md:text-[13px] text-[#111827] font-medium">{item.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Scores + Bars - Right */}
                    <div className="ml-auto flex flex-col space-y-6 shrink-0">
                      {criteriaData.map((item, i) => (
                        <div key={i} className="flex items-center h-[10px]">
                          <span className="text-[13px] font-semibold text-[#64748B] w-[30px] md:w-[36px] text-right shrink-0 mr-3 md:mr-5">{item.value.toFixed(1)}</span>
                          <div className="w-[100px] sm:w-[150px] md:w-[260px] h-[10px] bg-[#e5e7eb] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${(item.value / 9) * 100}%`, backgroundColor: item.color }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SCORING DETAILS */}
            <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 md:px-8 py-5">
                <h2 className="text-[15px] font-bold text-[#101828]">Scoring Details</h2>
                <p className="text-[12px] text-[#9ca3af] mt-0.5">Base, ceiling, and penalty breakdown</p>
              </div>
              <div className="px-5 md:px-8 pb-6">
                <div className="border border-[#f3f4f6] rounded-[10px] overflow-x-auto custom-scrollbar">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#fafafa]">
                        <th className="py-4 px-5 text-left text-[11px] font-semibold text-[#101828] tracking-wide">Criterion</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#101828] tracking-wide">Base</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#101828] tracking-wide">Ceiling</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#8B62F3] tracking-wide">Final</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#EA4335] tracking-wide">Major</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#F59E0B] tracking-wide">High</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#1A96F3] tracking-wide">Med</th>
                        <th className="py-4 px-4 text-left text-[11px] font-semibold text-[#101828] tracking-wide">Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoringDetails.map((row, i) => (
                        <tr key={i} className="border-t border-[#f3f4f6]">
                          <td className="py-4 px-5 text-[12px] font-medium text-[#101828]">{row.criterion}</td>
                          <td className="py-4 px-4 text-[13px] text-[#101828]">{row.base}</td>
                          <td className="py-4 px-4 text-[13px] text-[#101828]">{row.ceiling}</td>
                          <td className={`py-4 px-4 text-[13px] font-bold ${i === 0 ? 'text-[#F59E0B]' : 'text-[#30C3A9]'}`}>{row.final}</td>
                          <td className="py-4 px-4 text-[13px] text-[#101828]">{row.major}</td>
                          <td className="py-4 px-4 text-[13px] text-[#101828]">{row.high}</td>
                          <td className="py-4 px-4 text-[13px] text-[#101828]">{row.med}</td>
                          <td className="py-4 px-4 text-[13px] text-[#101828]">{row.low}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* STRENGTHS & WEAKNESSES */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="p-6 pb-4">
                  <h3 className="text-[14px] font-bold text-[#101828]">Strengths</h3>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">What you did well</p>
                </div>
                <div className="border-b border-[#f3f4f6]"></div>
                <div className="p-6 pt-4 space-y-4">
                  {strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <img src="/images/upload and mock/Vector (1).png" alt="" className="w-[16px] h-[14px] mt-[2px] shrink-0 object-contain" />
                      <span className="text-[12px] text-[#374151] leading-[1.6]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="p-6 pb-4">
                  <h3 className="text-[14px] font-bold text-[#101828]">Weaknesses</h3>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">Areas for improvement</p>
                </div>
                <div className="border-b border-[#f3f4f6]"></div>
                <div className="p-6 pt-4 space-y-4">
                  {weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <img src="/images/upload and mock/Vector.png" alt="" className="w-[16px] h-[14px] mt-[2px] shrink-0 object-contain" />
                      <span className="text-[12px] text-[#374151] leading-[1.6]">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ACCORDIONS */}
            <div className="space-y-3 pt-1">
              {accordions.map((acc, i) => (
                <div key={i} className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === i ? -1 : i)} 
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] font-bold text-[#111827]">{acc.title}</span>
                      <span className={`px-2.5 py-[2px] rounded-full text-[10px] font-bold ${getBandStyles(acc.bandColor)}`}>
                        {acc.band}
                      </span>
                    </div>
                    {openAccordion === i ? (
                      <ChevronUp className="w-4 h-4 text-[#64748b]" strokeWidth={2.5} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#64748b]" strokeWidth={2.5} />
                    )}
                  </button>
                  {openAccordion === i && acc.items && (
                    <div className="border-t border-[#f1f5f9]">
                      {acc.items.map((item, idx) => (
                        <div key={idx}>
                          <div className="px-6 py-5 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[13px] font-bold text-[#111827]">{item.name}</span>
                              <span className={`px-2 py-[1px] rounded-full text-[10px] font-bold ${getBandStyles(item.scoreColor || (parseFloat(item.score) >= 6 ? 'teal' : parseFloat(item.score) >= 5 ? 'orange' : 'red'))}`}>
                                BAND {item.score}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#64748b] leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                          {idx < acc.items.length - 1 && <div className="border-b border-[#f1f5f9]"></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
