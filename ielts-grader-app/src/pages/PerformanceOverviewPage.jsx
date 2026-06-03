import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'W1', overall: 6.6, response: 6.1, coherence: 5.8, vocabulary: 7.2, grammar: 6.3 },
  { name: '', overall: 7.1, response: 6.6, coherence: 6.3, vocabulary: 7.7, grammar: 6.8 },
  { name: 'W2', overall: 6.7, response: 6.2, coherence: 5.9, vocabulary: 7.3, grammar: 6.4 },
  { name: '', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.4, grammar: 7.5 },
  { name: 'W3', overall: 7.3, response: 6.8, coherence: 6.5, vocabulary: 7.9, grammar: 7.0 },
  { name: '', overall: 7.9, response: 7.4, coherence: 7.1, vocabulary: 8.4, grammar: 7.6 },
  { name: 'W4', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.1, grammar: 7.3 },
  { name: '', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.3, grammar: 7.5 },
  { name: 'W5', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.7, grammar: 7.9 },
  { name: '', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 7.9, grammar: 7.1 },
  { name: 'W6', overall: 7.9, response: 7.4, coherence: 7.1, vocabulary: 8.4, grammar: 7.6 },
  { name: '', overall: 6.4, response: 5.9, coherence: 5.6, vocabulary: 6.9, grammar: 6.1 },
  { name: 'W7', overall: 7.9, response: 7.4, coherence: 7.1, vocabulary: 8.4, grammar: 7.6 },
  { name: '', overall: 7.3, response: 6.8, coherence: 6.5, vocabulary: 7.8, grammar: 7.0 },
  { name: 'W8', overall: 8.1, response: 7.6, coherence: 7.3, vocabulary: 8.6, grammar: 7.8 },
];

const PerformanceOverviewPage = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeTask, setActiveTask] = useState("Academic Task 1");
  const [activeTab, setActiveTab] = useState("Overview");

  const handleExport = () => {
    window.print();
  };

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
                onClick={() => onBack ? onBack() : navigate(-1)}
                className="w-6 h-6 rounded-full border border-[#101828] flex items-center justify-center text-[#101828] hover:bg-black/5 transition-all bg-transparent"
              >
                <ArrowLeft size={14} strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2 cursor-pointer group">
                <h1 className="text-[22px] md:text-[24px] font-bold text-[#101828] tracking-tight">{activeTask}</h1>
                <ChevronDown size={22} className="text-[#101828] mt-0.5" />
              </div>
            </div>
            <button onClick={handleExport} className="w-full md:w-auto px-6 h-[42px] bg-[#344054] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#1D2939] transition-all shadow-sm">
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
                <span className="text-[#101828] tracking-tighter" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '40px', lineHeight: '1' }}>7.0</span>
                <span className="text-[14px] text-[#667085] mt-1.5 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Latest Band</span>
              </div>

              {/* First */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>First</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>5.5</span>
              </div>

              {/* Average */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Average</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>6.7</span>
              </div>

              {/* Best */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Best</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>7.5</span>
              </div>

              {/* Change */}
              <div className="flex-1 py-6 md:py-0 flex flex-col items-center justify-center">
                <span className="text-[13px] text-[#667085] mb-1 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Change</span>
                <span className="text-[28px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>+1.5</span>
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
                    <p className="text-[24px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>11</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#667085] mb-2 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>Study Period</p>
                    <p className="text-[20px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Feb 22_ Mar 6' 2026</p>
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
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>On the Rise</p>
                    <p className="text-[16px] font-normal text-[#101828] leading-[1.3] tracking-[0px]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Overall improvements: +1.5 from first to latest attempt.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Top Priority Fixes</p>
                    <p className="text-[14.5px] font-normal text-[#101828] leading-[1.3] tracking-[0px]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Focus heavily on reducing: Repetition of basic lexis, imprecise word choice, ideas underdeveloped.
                    </p>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="bg-white rounded-[24px] border border-[#E5E7EB] h-auto md:h-[320px] flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-[#F2F4F7]">
                  <h3 className="text-[17px] font-bold text-[#101828]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Strengths & Weaknesses</h3>
                </div>
                <div className="p-8 space-y-5 flex-1">
                  <div className="px-6 py-5 bg-[#F4FCF9] rounded-[16px] border border-[#E6F8F3] flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-white flex items-center justify-center shrink-0">
                      <TrendingUp className="text-[#30C3A9]" size={20} strokeWidth={2.5} />
                    </div>
                    <p className="text-[15px] leading-[1.6] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#30C3A9]">Coherence & cohesion:</span> <span className="font-bold text-[#101828]">currently 7.0</span><br />
                      <span className="font-bold text-[#101828]">(Keep this stable while you lift your<br className="sm:hidden" /> weakest areas).</span>
                    </p>
                  </div>
                  <div className="px-6 py-5 bg-[#FFF7F7] rounded-[16px] border border-[#FEEDED] flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-white flex items-center justify-center shrink-0">
                      <TrendingDown className="text-[#EA4335]" size={20} strokeWidth={2.5} />
                    </div>
                    <p className="text-[15px] leading-[1.6] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      <span className="font-bold text-[#EA4335]">Grammatical Range:</span> <span className="font-bold text-[#101828]">currently 5.5</span><br />
                      <span className="font-bold text-[#101828]">(This is your primary bottleneck,<br className="sm:hidden" /> focus here).</span>
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
                      Total Instances: <span className="text-[#101828] font-bold">89</span>
                    </span>
                    <span className="text-[14px] font-semibold text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      Unique Types: <span className="text-[#101828] font-bold">28</span>
                    </span>
                  </div>

                  {/* Mistake Rows */}
                  <div className="space-y-0 flex-1">
                    {[
                      { label: "Repetition of Basic Lexis", count: "58", type: "red" },
                      { label: "Imprecise Word Choice", count: "44", type: "red" },
                      { label: "Ideas Underdeveloped", count: "27", type: "yellow" },
                      { label: "Unclear Referencing", count: "26", type: "yellow" },
                      { label: "Logical Progression Gap", count: "11", type: "gray" },
                      { label: "Imprecise Word Choice", count: "44", type: "red" }
                    ].map((item, index) => {
                      const colors = {
                        red: "text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]",
                        yellow: "text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]",
                        gray: "text-[#344054] bg-[#F2F4F7] border-[#D0D5DD]"
                      };
                      return (
                        <div key={index} className={`flex items-center justify-between py-3 ${index !== 5 ? 'border-b border-[#F2F4F7]' : ''}`}>
                          <span className={`px-4 py-1.5 rounded-full border text-[13px] font-bold ${colors[item.type]}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
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
                {[
                  { label: "Task Response", first: "6.0", latest: "7.0", growth: "+1.0" },
                  { label: "Lexical Resource", first: "5.0", latest: "7.0", growth: "+2.0" }
                ].map(item => (
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
                        <div className="bg-[#F0FDF9] text-[#30C3A9] px-4 py-1.5 rounded-full text-[13px] font-bold border border-[#30C3A94D]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {item.growth}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Col 2: Coherence & Grammatical */}
              <div className="space-y-8">
                {[
                  { label: "Coherence", first: "5.5", latest: "7.0", growth: "+1.5" },
                  { label: "Grammatical", first: "5.0", latest: "6.5", growth: "+1.5" }
                ].map(item => (
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
                        <div className="bg-[#F0FDF9] text-[#30C3A9] px-4 py-1.5 rounded-full text-[13px] font-bold border border-[#30C3A980]" style={{ fontFamily: "'Nunito', sans-serif" }}>
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
                  {/* Impact Rows */}
                  <div className="space-y-0 flex-1">
                    {[
                      { label: "Repetition of basic lexis", impact: "High Impact", type: "red" },
                      { label: "Imprecise word choice", impact: "High Impact", type: "red" },
                      { label: "Ideas underdeveloped", impact: "Medium Impact", type: "yellow" },
                      { label: "Imprecise word choice", impact: "High Impact", type: "red" },
                      { label: "Imprecise word choice", impact: "High Impact", type: "red" },
                      { label: "Ideas underdeveloped", impact: "Medium Impact", type: "yellow" },
                      { label: "Imprecise word choice", impact: "High Impact", type: "red" }
                    ].map((item, index) => {
                      const colors = {
                        red: "text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]",
                        yellow: "text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]"
                      };
                      return (
                        <div key={index} className={`flex items-center justify-between ${index === 6 ? 'pt-3 pb-1' : 'py-3'} ${index !== 6 ? 'border-b border-[#F2F4F7]' : ''}`}>
                          <span className="text-[16px] font-bold text-[#344054]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                            {item.label}
                          </span>
                          <span className={`px-4 py-1.5 rounded-full border text-[14px] font-bold ${colors[item.type]}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
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
                <span className="text-[20px] font-bold text-[#00C9B1]">+1.5</span>
              </div>
              <div className="bg-[#F8FAFC] rounded-[12px] p-6 flex items-center justify-between border border-gray-50/50">
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Current Status</h4>
                  <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>Overall Band Score</p>
                </div>
                <span className="text-[20px] font-bold text-[#00C9B1]">7.0</span>
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
                  You have reached on overall band of 7.0, showing an impressive improvement of +1.5 since your first attempt. keep applying the feedback to maintain this upwars momentum.
                </p>

                <div className="bg-[#FFF9F2] border border-[#FFE4BA] rounded-[12px] px-5 py-4">
                   <p className="text-[16.5px] leading-relaxed text-[#101828] font-normal" style={{ fontFamily: "'Nunito', sans-serif" }}>
                     <span className="text-[#DC6803] font-bold">Tutor Notice (Plateau):</span> You've been scoring exactly the same over the last 5 attempts (stagnant). This is a habit loop. Focus entirely on your highest priority Fix Cards to break it.
                   </p>
                </div>
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
            {/* Errors by Criterion */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
              <div className="px-8 py-5 border-b border-[#F2F4F7]">
                <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Errors by Criterion</h3>
              </div>
              
              <div className="p-5 space-y-3">
                {[
                  { label: "Lexical Resource", count: 153 },
                  { label: "Coherence & Cohesion", count: 51 },
                  { label: "Grammatical Range & Accuracy", count: 47 },
                  { label: "Task Response", count: 38 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between px-6 py-4 bg-white border border-[#E5E7EB] rounded-[12px] hover:border-gray-200 transition-colors">
                    <span className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.label}</span>
                    <span className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Error Sub-Categories */}
            {/* Top Error Sub-Categories */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-5 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Top Error Sub-Categories</h3>
               </div>
               
               <div className="p-6 space-y-3">
                  {[
                    { label: "Word Choice", count: "89" },
                    { label: "Range", count: "58" },
                    { label: "Accuracy", count: "37" },
                    { label: "Development", count: "27" },
                    { label: "Referencing", count: "26" },
                    { label: "Progression", count: "11" },
                    { label: "Cohesive Devices", count: "8" },
                    { label: "Punctuation", count: "6" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-8 py-5 bg-white border border-[#E5E7EB] rounded-[12px] hover:border-gray-200 transition-all cursor-pointer group">
                       <span className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.label}</span>
                       <span className="text-[16px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>{item.count}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Fix Cards-Priority Errors */}
            <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] flex flex-col overflow-hidden">
               <div className="px-8 py-5 border-b border-[#F2F4F7]">
                 <h3 className="text-[18px] font-bold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif" }}>Fix Cards-Priority Errors</h3>
                 <p className="text-[14px] text-[#475467]" style={{ fontFamily: "'Nunito', sans-serif" }}>Click "Details" to view examples & actionable playbook drills.</p>
               </div>

               <div className="p-8 space-y-4">
                  {[
                    { title: "Repetition of Basic Lexis", desc: "Mostly affects: Lexical resource", impact: "High Impact", count: "58", colors: "text-[#EA4335] bg-[#EA43351A] text-[14px]" },
                    { title: "Imprecise Word Choice", desc: "Mostly affects: Lexical resource", impact: "High Impact", count: "44", colors: "text-[#EA4335] bg-[#EA43351A] text-[14px]" },
                    { title: "Ideas Underdeveloped", desc: "Mostly affects: Lexical resource", impact: "Medium Impact", count: "27", colors: "text-[#F59E0B] bg-[#F59E0B1A] text-[13px]" },
                    { title: "Unclear Referencing", desc: "Mostly affects: Coherence & cohesion", impact: "Medium Impact", count: "26", colors: "text-[#F59E0B] bg-[#F59E0B1A] text-[13px]" },
                    { title: "Logical Progression Gap", desc: "Mostly affects: Coherence & cohesion", impact: "Low Impact", count: "11", colors: "text-[#101828] bg-[#1018280D] text-[14px]" },
                    { title: "Collection Error", desc: "Mostly affects: Lexical resource", impact: "Low Impact", count: "18", colors: "text-[#101828] bg-[#1018280D] text-[14px]" },
                    { title: "Task Achievement Partial", desc: "Mostly affects: Task response", impact: "Low Impact", count: "5", colors: "text-[#101828] bg-[#1018280D] text-[14px]" },
                    { title: "Wrong Word Form", desc: "Mostly affects: Lexical resource", impact: "Low Impact", count: "14", colors: "text-[#101828] bg-[#1018280D] text-[14px]" }
                  ].map((card, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-white border border-[#E5E7EB] rounded-[12px] hover:shadow-md transition-all">
                       <div className="flex-1">
                          <h4 className="text-[16px] font-bold text-[#101828] mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>{card.title}</h4>
                          <p className="text-[16px] font-semibold text-[#101828]" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>
                             <span className="font-bold">Mostly affects:</span> {card.desc.split(': ')[1]}
                          </p>
                       </div>
                       
                       <div className="flex items-center gap-6">
                          <div className={`w-[130px] px-4 py-1.5 rounded-full font-bold ${card.colors} text-center`} style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>
                             {card.impact}
                          </div>
                          <div className="w-[100px] px-4 py-1.5 bg-[#1018280D] rounded-full text-[14px] font-bold text-[#101828] text-center" style={{ fontFamily: "'Nunito', sans-serif", lineHeight: '100%' }}>
                             Count: {card.count}
                          </div>
                          <button className="px-5 py-2.5 bg-[#2C3E50] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#1D2939] transition-all" style={{ fontFamily: "'Nunito', sans-serif" }}>
                             Details
                          </button>
                       </div>
                    </div>
                  ))}
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

export default PerformanceOverviewPage;