import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, ChevronLeft, ChevronDown, Info } from 'lucide-react';
import { useGrade } from '../context/GradeContext';
import Footer from '../components/Footer';

const MockExamPage = () => {
  const navigate = useNavigate();
  const { essayData, updateEssayData, userStatus } = useGrade();
  const [activeTask, setActiveTask] = useState(essayData.taskType || 'Task 2');
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [task1Content, setTask1Content] = useState('');
  const [task2Content, setTask2Content] = useState('');

  const currentContent = activeTask === 'Task 1' ? task1Content : task2Content;
  const setcurrentContent = activeTask === 'Task 1' ? setTask1Content : setTask2Content;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    updateEssayData({ 
      essayContent: task2Content, // Primary focus usually on Task 2 for this flow
      task1Content,
      task2Content,
      taskType: activeTask
    });
    if (userStatus.isLoggedIn) {
      navigate('/analysis-ready');
    } else {
      navigate('/selection');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-['Inter',_sans-serif]">
      {/* Top Header */}
      <header className="h-[64px] md:h-[72px] border-b border-[#E5E7EB] px-4 md:px-8 flex items-center justify-between bg-white shrink-0 relative z-[100]">
        <div className="flex items-center gap-3 md:gap-3.5">
          <div className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] bg-[#EFF6FF] rounded-[8px] md:rounded-[10px] flex items-center justify-center text-[#3B82F6] text-[13px] md:text-[14px] font-bold">
            JD
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] md:text-[14px] font-semibold text-[#1a1f36]">Candidate</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] hidden sm:block" />
            </div>
            <span className="text-[11px] md:text-[12px] text-[#6B7280]">
              IELTS Writing {activeTask}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-2.5 px-3 md:px-5 py-1.5 bg-[#FEE2E2] border border-[#FECACA]/60 rounded-full">
          <Clock className="w-4 h-4 text-[#EF4444]" />
          <span className="text-[14px] md:text-[16px] font-mono font-bold text-[#EF4444] tracking-wider">
            {formatTime(timeLeft)}
          </span>
        </div>

        <button className="hidden sm:flex items-center gap-2 px-5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] font-medium text-[#4B5563] hover:bg-gray-50 transition-all">
          <Info className="w-4 h-4" />
          Help
        </button>
      </header>

      {/* Main Content Split View */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Task Description */}
        <div 
          data-lenis-prevent
          className="w-full md:w-[50%] h-[40%] md:h-full border-b md:border-b-0 md:border-r border-[#E5E7EB] bg-[#FAFBFC] overflow-y-auto custom-scrollbar p-6 md:p-12"
        >
          <div className="max-w-[580px] mx-auto md:mx-0">
            <div className="inline-flex items-center px-4 py-1.5 bg-[#EBF5FF] text-[#1E40AF] text-[13px] font-medium rounded-full mb-6 md:mb-8">
              Academic {activeTask}
            </div>
            
            {activeTask === 'Task 1' ? (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-[15px] md:text-[16px] font-bold text-[#1a1f36] leading-[1.6] md:leading-[1.7] mb-4 md:mb-6">
                  The chart below shows the changes in global population by region between 1950 and 2000, and also the predictions for 2050.
                </h2>
                <div className="space-y-3 text-[13px] md:text-[14px] text-[#4B5563] leading-[1.6] md:leading-[1.7]">
                  <p>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>
                  <p>Write at least 150 words. You have 20 minutes.</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-[15px] md:text-[16px] font-bold text-[#1a1f36] leading-[1.6] md:leading-[1.7] mb-4 md:mb-6">
                  Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.
                </h2>
                <div className="space-y-3 text-[13px] md:text-[14px] text-[#4B5563] leading-[1.6] md:leading-[1.7]">
                  <p>Discuss both these views and give your own opinion.</p>
                  <p>Write at least 250 words. You have 40 minutes.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Typing Area */}
        <div className="w-full md:flex-1 h-[60%] md:h-full flex flex-col bg-white">
          <textarea
            data-lenis-prevent
            key={activeTask}
            value={currentContent}
            onChange={(e) => setcurrentContent(e.target.value)}
            placeholder="Start writing your essay here..."
            className="flex-1 w-full text-[14px] md:text-[15px] text-[#1a1f36] leading-[1.6] md:leading-[1.8] outline-none transition-all resize-none custom-scrollbar p-6 md:p-12 appearance-none"
          ></textarea>
        </div>
      </main>

      {/* Bottom Exam Toolbar */}
      <footer className="h-auto md:h-[72px] py-4 md:py-0 border-t border-[#E5E7EB] px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 bg-white shrink-0 pb-[max(env(safe-area-inset-bottom),16px)] md:pb-0">
        {/* Task Selection */}
        <div className="flex w-full md:w-auto items-center justify-center gap-3 md:gap-2.5 bg-[#F3F4F6] p-1 rounded-[10px] md:bg-transparent md:p-0 md:rounded-none">
          <button 
            onClick={() => setActiveTask('Task 1')}
            className={`flex-1 md:flex-none h-[44px] md:h-auto md:py-2 rounded-[8px] text-[14px] md:text-[13px] font-bold transition-all ${
              activeTask === 'Task 1' 
                ? 'bg-white text-[#1a1f36] shadow-sm md:shadow-none md:bg-[#1a1f36] md:text-white' 
                : 'text-[#6B7280] hover:text-[#1a1f36] md:bg-white md:border md:border-[#E5E7EB] md:text-[#1a1f36] md:hover:bg-gray-50'
            }`}
          >
            Task 1
          </button>
          <button 
            onClick={() => setActiveTask('Task 2')}
            className={`flex-1 md:flex-none h-[44px] md:h-auto md:py-2 rounded-[8px] text-[14px] md:text-[13px] font-bold transition-all ${
              activeTask === 'Task 2' 
                ? 'bg-white text-[#1a1f36] shadow-sm md:shadow-none md:bg-[#1a1f36] md:text-white' 
                : 'text-[#6B7280] hover:text-[#1a1f36] md:bg-white md:border md:border-[#E5E7EB] md:text-[#1a1f36] md:hover:bg-gray-50'
            }`}
          >
            Task 2
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 md:gap-5">
          <span className="hidden sm:block text-[13px] md:text-[14px] font-semibold text-[#1a1f36]">
            {currentContent.split(/\s+/).filter(x => x).length} words
          </span>
          <div className="flex w-full sm:w-auto items-center gap-3 md:gap-2.5">
            <button className="hidden sm:block px-4 md:px-5 h-[48px] md:h-[40px] bg-white border border-[#E5E7EB] rounded-[10px] md:rounded-[8px] text-[14px] md:text-[13px] font-semibold text-[#1a1f36] hover:bg-gray-50 transition-all">
              Upload
            </button>
            <button 
              onClick={() => setcurrentContent('')}
              className="flex-1 sm:flex-none px-4 md:px-5 h-[48px] md:h-[40px] bg-white border border-[#E5E7EB] rounded-[10px] md:rounded-[8px] text-[14px] md:text-[13px] font-bold text-[#1a1f36] hover:bg-gray-50 transition-all shadow-sm md:shadow-none"
            >
              Clear
            </button>
            <button 
              onClick={handleSubmit}
              className="flex-[2] sm:flex-none px-5 md:px-7 h-[48px] md:h-[40px] bg-[#1a1f36] text-white rounded-[10px] md:rounded-[8px] font-bold text-[14px] md:text-[13px] hover:bg-[#2a2f46] transition-all active:scale-[0.98] shadow-sm md:shadow-none"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MockExamPage;
