import React, { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Upload, Trash2, CheckCircle2, ChevronDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

const MockExam = ({ examType, taskType, onExit }) => {
  const [essay, setEssay] = useState('');
  const [timeLeft, setTimeLeft] = useState(2399); // 00:39:59 in seconds
  const [wordCount, setWordCount] = useState(0);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [completedCriteria, setCompletedCriteria] = useState([]);
  const [gradingError, setGradingError] = useState(null);
  const pollRef = useRef(null);
  // Default question text for mock exams (since no prompt file is uploaded)
  const mockQuestionText = taskType === 'Task 1'
    ? 'The diagram below shows the water cycle. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    : 'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your own opinion.';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [essay]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your essay?')) {
      setEssay('');
    }
  };

  const handleStartGrading = () => {
    setShowTimeUp(false);
    setIsGrading(true);
  };

  // ── Real grading pipeline ──────────────────────────────────────────────────
  // Triggered when isGrading becomes true.
  // Flow: createSubmission → /grade (async) → poll Supabase → getReport → onExit
  useEffect(() => {
    if (!isGrading) return;

    setGradingProgress(0);
    setCompletedCriteria([]);
    setGradingError(null);

    const runGrading = async () => {
      try {
        // 1. Create submission record in Supabase
        setGradingProgress(10);
        const submissionId = await api.createSubmission({
          task_type: taskType || 'Task 2',
          exam_type: examType || 'Academic',
          essay_content: essay,
          question_text: mockQuestionText,
        });
        setGradingProgress(20);

        // 2. Send to Fly.io grading service (returns 202 immediately)
        await api.submitAttempt({
          submission_id: submissionId,
          task_type: taskType || 'Task 2',
          exam_type: examType || 'Academic',
          essay_content: essay,
          question_text: mockQuestionText,
        });
        setGradingProgress(25);

        // 3. Poll Supabase every 2s for real status
        await new Promise((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            try {
              const { status, progress_pct } = await api.checkStatus(submissionId);
              const realPct = Math.max(25, Math.min(95, progress_pct ?? 0));
              setGradingProgress(realPct);

              if (realPct > 15) setCompletedCriteria(p => p.includes(0) ? p : [...p, 0]);
              if (realPct > 40) setCompletedCriteria(p => p.includes(1) ? p : [...p, 1]);
              if (realPct > 65) setCompletedCriteria(p => p.includes(2) ? p : [...p, 2]);
              if (realPct >= 90) setCompletedCriteria(p => p.includes(3) ? p : [...p, 3]);

              if (status === 'graded') {
                clearInterval(pollRef.current);
                resolve(submissionId);
              } else if (status === 'failed') {
                clearInterval(pollRef.current);
                reject(new Error('Grading failed on the server.'));
              }
            } catch (pollErr) {
              clearInterval(pollRef.current);
              reject(pollErr);
            }
          }, 2000);
        });

        // 4. Fetch the full report
        setGradingProgress(97);
        setCompletedCriteria([0, 1, 2, 3]);
        const reportData = await api.getReport(submissionId);
        setGradingProgress(100);

        // 5. Exit with real report data
        setTimeout(() => {
          if (onExit) onExit('report', reportData);
        }, 800);

      } catch (err) {
        console.error('[MockExam] Grading error:', err);
        setGradingError(err.message || 'Something went wrong. Please try again.');
        setGradingProgress(0);
      }
    };

    runGrading();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isGrading]);

  const handleSubmit = () => {
    setIsGrading(true);
  };

  return (
    <div className="fixed inset-0 bg-white z-[200] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-[64px] border-b border-gray-100 flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-[#E0F2FE] items-center justify-center text-[#0EA5E9] font-bold text-[12px]">
            JD
          </div>
          <div>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[13px] md:text-[14px] font-semibold text-[#101828]">Candidate</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <div className="text-[10px] md:text-[11px] text-gray-500 font-medium truncate max-w-[120px] md:max-w-none">
              IELTS Writing {examType} {taskType || 'Task 2'}
            </div>
          </div>
        </div>

        {/* Timer Pill */}
        <div className="flex items-center justify-center gap-2">
          <div className="bg-[#FFE4E6] px-3 md:px-4 py-1.5 rounded-[12px] flex items-center gap-2">
             <Clock size={16} className="text-[#EF4444]" strokeWidth={2.5} />
             <span className="text-[13px] md:text-[14px] font-bold text-[#EF4444] font-sans">
               {formatTime(timeLeft).split(':').slice(1).join(':')}
             </span>
          </div>
          {/* Debug Bypass Button - Hidden on mobile for space */}
          <button 
            onClick={() => { setTimeLeft(0); setShowTimeUp(true); }}
            className="hidden sm:flex items-center p-2 text-gray-300 hover:text-[#EF4444] transition-colors"
            title="Bypass Timer (Dev Only)"
          >
            <Clock size={14} className="opacity-50" />
            <span className="text-[10px] ml-1 font-bold">BYPASS</span>
          </button>
        </div>

        <button className="flex items-center gap-2 px-3 h-[36px] border border-gray-200 rounded-[8px] text-[12px] md:text-[13px] font-medium text-[#344054] hover:bg-gray-50 transition-all">
          <HelpCircle size={16} />
          <span className="hidden sm:inline">Help</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Question Area */}
        <div className="w-full md:w-[400px] lg:w-[480px] border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto p-6 md:p-10 bg-[#F8FAFC]">
          <div className="mb-4 md:mb-6">
            <span className="bg-[#E0F2FE] text-[#0EA5E9] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {examType} {taskType || 'Task 2'}
            </span>
          </div>
          
          <h2 className="text-[14px] md:text-[15px] font-bold text-[#101828] leading-[1.6] mb-5">
            Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.
          </h2>

          <div className="space-y-4 text-[11px] md:text-[12px] text-[#475467] leading-[1.7] font-medium opacity-90">
            <p>Discuss both these views and give your own opinion.</p>
            <p>Write at least 250 words. You have 40 minutes.</p>
          </div>
        </div>

        {/* Right: Editor Area */}
        <div className="flex-1 flex flex-col bg-white">
          <textarea
            className="flex-1 p-10 outline-none text-[16px] text-[#475467] leading-[1.8] font-normal resize-none placeholder:text-gray-300 custom-scrollbar"
            placeholder="Start writing your essay here..."
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            disabled={showTimeUp}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="h-[72px] border-t border-gray-100 flex items-center justify-between px-8 bg-white shrink-0">
        <div className="flex gap-2">
          <button className="px-6 h-[40px] border border-gray-200 rounded-[8px] text-[14px] font-bold text-gray-400 hover:bg-gray-50 transition-all">
            Task 1
          </button>
          <button className="px-6 h-[40px] bg-[#2C3E50] text-white rounded-[8px] text-[14px] font-bold transition-all">
            Task 2
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-[14px] font-medium text-gray-500">
            <span className="text-[#101828] font-bold mr-1">{wordCount}</span> words
          </div>
          
          <div className="flex gap-2.5">
            <button className="px-5 h-[40px] border border-gray-200 rounded-[8px] text-[14px] font-bold text-[#344054] hover:bg-gray-50 transition-all flex items-center gap-2">
              <Upload size={16} />
              Upload File
            </button>
            <button 
              onClick={handleClear}
              className="px-5 h-[40px] border border-gray-200 rounded-[8px] text-[14px] font-bold text-[#344054] hover:bg-gray-50 transition-all"
            >
              Clear
            </button>
            <button 
              onClick={handleSubmit}
              className="px-6 h-[40px] bg-[#2C3E50] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </footer>

      {/* Time's Up Modal */}
      <AnimatePresence>
        {showTimeUp && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-[380px] rounded-[20px] p-7 shadow-2xl flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setShowTimeUp(false)}
                className="absolute top-4 right-5 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={20} strokeWidth={2} />
              </button>

              <div className="w-14 h-14 bg-[#00A3FF] rounded-full flex items-center justify-center text-white mb-5 shadow-lg shadow-[#00A3FF44]">
                <Clock size={28} strokeWidth={2.5} />
              </div>

              <h3 className="text-[18px] font-bold text-[#111827] mb-2.5">Time's Up!</h3>
              
              <div className="text-[13px] text-gray-500 leading-[1.6] mb-7 max-w-[280px]">
                In the real IELTS, your screen will lock exactly like this. Let's see how you did.
              </div>

              <button 
                onClick={handleStartGrading}
                className="w-full bg-[#344054] text-white h-[44px] rounded-[10px] text-[14px] font-bold transition-all hover:bg-[#1D2939]"
              >
                Grade What I Have
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Grading Modal */}
      <AnimatePresence>
        {isGrading && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-[400px] rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center font-sans"
            >
              <button 
                onClick={() => setIsGrading(false)}
                className="absolute top-5 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} strokeWidth={1.5} />
              </button>

              {gradingError ? (
                <div className="w-full text-center space-y-5 py-2">
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <h3 className="text-[18px] font-bold text-[#111827]">Grading Failed</h3>
                  <p className="text-[13px] text-gray-500 max-w-[280px] mx-auto">{gradingError}</p>
                  <div className="space-y-2 pt-1">
                    <button onClick={() => { setGradingError(null); setIsGrading(false); setTimeout(() => setIsGrading(true), 100); }} className="w-full bg-[#2C3E50] text-white h-[44px] rounded-[10px] text-[14px] font-bold hover:bg-[#34495E] transition-all">
                      Retry
                    </button>
                    <button onClick={() => { setIsGrading(false); setGradingError(null); }} className="w-full border border-gray-200 text-[#344054] h-[44px] rounded-[10px] text-[14px] font-bold hover:bg-gray-50 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
              <>
              {/* Brain Circle Animation */}
              <div className="relative w-[70px] h-[70px] mb-8">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="35" cy="35" r="32" fill="transparent" stroke="#F0F9FF" strokeWidth="4" />
                   <motion.circle
                     cx="35" cy="35" r="32" fill="transparent" stroke="#00A3FF" strokeWidth="4"
                     strokeDasharray={2 * Math.PI * 32}
                     initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                     animate={{ strokeDashoffset: (2 * Math.PI * 32) * (1 - gradingProgress / 100) }}
                     strokeLinecap="round"
                   />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-[#00A3FF]">
                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
                     <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
                   </svg>
                 </div>
              </div>

              <h3 className="text-[20px] font-bold text-[#111827] mb-2">AI is grading your essay</h3>
              <p className="text-[13px] text-[#475467] font-medium mb-8">
                This takes 45-60 seconds. Please keep this tab open.
              </p>

              {/* Progress Card */}
              <div className="w-full bg-[#F0F9FF] rounded-[16px] p-5 mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[14px] font-bold text-[#111827]">Finalizing Band Score</span>
                  <span className="text-[12px] font-bold text-gray-500">{gradingProgress}%</span>
                </div>
                <div className="w-full h-[10px] bg-[#D1E9FF] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${gradingProgress}%` }}
                    className="h-full bg-[#00A3FF] rounded-full"
                  />
                </div>
              </div>

              {/* Criteria Checklist */}
              <div className="w-full space-y-5 px-1">
                {[
                  "Task Response",
                  "Coherence",
                  "Lexical Resource",
                  "Grammatical"
                ].map((item, idx) => {
                  const isDone = completedCriteria.includes(idx);
                  const isCurrent = !isDone && (completedCriteria.length === idx);
                  
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isDone ? (
                          <div className="w-6 h-6 bg-[#66E0C2] rounded-full flex items-center justify-center text-white">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        ) : isCurrent ? (
                          <div className="relative w-6 h-6">
                            <div className="absolute inset-0 border-2 border-gray-100 rounded-full" />
                            <motion.div 
                              className="absolute inset-0 border-2 border-[#00A3FF] rounded-full border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-100 rounded-full" />
                        )}
                      </div>
                      <span className={`text-[15px] font-medium transition-colors duration-300 ${isDone ? "text-gray-400" : isCurrent ? "text-[#111827]" : "text-gray-300"}`}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
              </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockExam;
