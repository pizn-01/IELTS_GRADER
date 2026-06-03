import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Clock, Info, FileText, ChevronDown } from 'lucide-react';
import { api } from '../services/api';

const FileIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M13 2H6a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V10l-8-8z" />
    <path d="M13 2v8h8" />
  </svg>
);

const PracticeModal = ({ isOpen, onClose, onAnalysisComplete, onStartMock }) => {
  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState('');
  const [taskType, setTaskType] = useState('');
  const [selectedOption, setSelectedOption] = useState('upload'); // 'upload' or 'mock'
  const [promptFile, setPromptFile] = useState(null);
  const [essayFile, setEssayFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [completedItems, setCompletedItems] = useState([]);
  const [gradingError, setGradingError] = useState(null);
  const pollRef = useRef(null);

  // ── Real grading pipeline ──────────────────────────────────────────────────
  // Triggered when step becomes 3 (analysis screen).
  // Flow: extractText → createSubmission → /grade (async) → poll status → getReport
  React.useEffect(() => {
    if (step !== 3 || !isOpen) return;

    setProgress(0);
    setCompletedItems([]);
    setGradingError(null);

    const runGrading = async () => {
      try {
        // 1. Extract text from uploaded files
        setProgress(5);
        const { question_text, essay_content } = await api.extractText(promptFile, essayFile);
        setProgress(15);

        // 2. Create a submission record in Supabase
        const submissionId = await api.createSubmission({
          task_type: taskType,
          exam_type: examType,
          essay_content,
          question_text,
        });
        setProgress(20);

        // 3. Send to Fly.io grading service (returns 202 immediately)
        await api.submitAttempt({
          submission_id: submissionId,
          task_type: taskType,
          exam_type: examType,
          essay_content,
          question_text,
        });
        setProgress(25);

        // 4. Poll Supabase for real status every 2 seconds
        await new Promise((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            try {
              const { status, progress_pct } = await api.checkStatus(submissionId);
              const realPct = Math.max(25, Math.min(95, (progress_pct ?? 0)));
              setProgress(realPct);

              // Advance checklist based on real progress
              if (realPct > 30) setCompletedItems(p => p.includes(0) ? p : [...p, 0]);
              if (realPct > 55) setCompletedItems(p => p.includes(1) ? p : [...p, 1]);
              if (realPct > 75) setCompletedItems(p => p.includes(2) ? p : [...p, 2]);

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

        // 5. Fetch the full report
        setProgress(97);
        setCompletedItems([0, 1, 2, 3]);
        const reportData = await api.getReport(submissionId);
        setProgress(100);

        // 6. Navigate — pass real report data up
        setTimeout(() => onAnalysisComplete(reportData), 800);

      } catch (err) {
        console.error('[PracticeModal] Grading error:', err);
        setGradingError(err.message || 'Something went wrong. Please try again.');
        setProgress(0);
      }
    };

    runGrading();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, isOpen]);

  const resetAndClose = () => {
    setStep(1);
    setPromptFile(null);
    setEssayFile(null);
    setExamType('');
    setTaskType('');
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-[#00000066] backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-[440px] h-auto max-h-[95vh] rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Close Button */}
            <button 
              onClick={resetAndClose}
              className="absolute top-5 right-6 text-gray-400 hover:text-[#111827] transition-colors z-10"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            <div className="p-6 md:p-8 font-sans">
              {step === 1 ? (
                <div className="flex flex-col">
                  <div className="mb-5">
                    <h2 className="text-[18px] font-bold text-[#111827]">
                      Evaluate Your Essay Writing Skills
                    </h2>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Upload Essay Option */}
                    <div 
                      onClick={() => setSelectedOption('upload')} 
                      className={`border-[1.5px] rounded-[16px] p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${selectedOption === 'upload' ? 'border-[#1A96F3] bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-colors ${selectedOption === 'upload' ? 'bg-[#E3F2FD] text-[#1A96F3]' : 'bg-[#F8FAFC] text-gray-400'}`}>
                        <Upload size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[14px] font-bold text-[#111827]">Upload Essay</span>
                        <Info size={13} className="text-gray-300" strokeWidth={2} />
                      </div>
                      <p className="text-[11px] text-gray-400 max-w-[240px] leading-snug">
                        Upload your question and answer (PDF, Word, JPG, etc.)
                      </p>
                    </div>

                    {/* Mock Exam Option */}
                    <div 
                      onClick={() => setSelectedOption('mock')} 
                      className={`border-[1.5px] rounded-[16px] p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${selectedOption === 'mock' ? 'border-[#1A96F3] bg-white' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-colors ${selectedOption === 'mock' ? 'bg-[#E3F2FD] text-[#1A96F3]' : 'bg-[#F8FAFC] text-gray-400'}`}>
                        <Clock size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[14px] font-bold text-[#111827]">Mock Exam</span>
                        <Info size={13} className="text-gray-300" strokeWidth={2} />
                      </div>
                      <p className="text-[11px] text-gray-400 max-w-[240px] leading-snug">
                        Practice in a real IELTS computer- based environment with timer
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full bg-[#2C3E50] text-white h-[46px] rounded-[10px] text-[15px] font-bold flex items-center justify-center transition-all hover:bg-[#34495E]"
                    >
                      Get Started
                    </button>
                    <button 
                      onClick={resetAndClose}
                      className="w-full border border-gray-200 text-[#2C3E50] h-[46px] rounded-[10px] text-[15px] font-bold flex items-center justify-center transition-all hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : step === 2 ? (
                <div className="flex flex-col font-sans h-full">
                  <div className="mb-5">
                    <h2 className="text-[18px] font-bold text-[#111827]">
                      {selectedOption === 'upload' ? 'Upload Essay' : 'Mock Exam'}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Exam Type */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-[#111827]">Exam Type</label>
                      <div className="relative">
                        <select 
                          value={examType}
                          onChange={(e) => setExamType(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[10px] px-4 h-[44px] appearance-none text-[13px] outline-none focus:border-[#1A96F3] transition-colors text-gray-500 font-medium"
                        >
                          <option value="" disabled>Select</option>
                          <option>Academic</option>
                          <option>General</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>

                    {/* Task Type */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-[#111827]">Task Type</label>
                      <div className="relative">
                        <select 
                          value={taskType}
                          onChange={(e) => setTaskType(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[10px] px-4 h-[44px] appearance-none text-[13px] outline-none focus:border-[#1A96F3] transition-colors text-gray-500 font-medium"
                        >
                          <option value="" disabled>Select</option>
                          <option>Task 1</option>
                          <option>Task 2</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>

                    {selectedOption === 'upload' && (
                      <>
                        {/* Prompt Upload */}
                        <div className="space-y-1">
                          <label className="text-[12px] font-bold text-[#111827]">Upload Prompt / Question</label>
                          {promptFile ? (
                            <div className="border border-[#1A96F3] bg-[#EBF5FF] rounded-[12px] p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-[#1A96F3]">
                                  <FileIcon size={20} />
                                </div>
                                <div>
                                  <div className="text-[13px] font-medium text-[#111827]">{promptFile.name}</div>
                                  <div className="text-[11px] text-gray-500">{(promptFile.size / 1024).toFixed(0)} KB</div>
                                </div>
                              </div>
                              <button onClick={() => setPromptFile(null)} className="text-gray-400 hover:text-[#111827] transition-colors">
                                <X size={18} strokeWidth={1.5} />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="border border-dashed border-gray-200 rounded-[12px] p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#1A96F3] bg-[#F9FAFB]/50"
                              onClick={() => document.getElementById('prompt-input').click()}
                            >
                              <div className="w-6 h-6 bg-[#E3F2FD] rounded-md flex items-center justify-center text-[#1A96F3] mb-1">
                                <Upload size={12} />
                              </div>
                              <div className="text-[10px] text-gray-600">
                                Drag & Drop Or <span className="text-[#1A96F3] font-bold underline">Browse</span>
                              </div>
                              <p className="text-[8px] text-gray-400 mt-0.5 uppercase tracking-tight">PDF, JPG, PNG</p>
                              <input id="prompt-input" type="file" className="hidden" onChange={(e) => setPromptFile(e.target.files[0])} />
                            </div>
                          )}
                        </div>

                        {/* Essay Upload */}
                        <div className="space-y-1">
                          <label className="text-[12px] font-bold text-[#111827]">Upload Your Essay</label>
                          {essayFile ? (
                            <div className="border border-[#1A96F3] bg-[#EBF5FF] rounded-[12px] p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-[#1A96F3]">
                                  <FileIcon size={20} />
                                </div>
                                <div>
                                  <div className="text-[13px] font-medium text-[#111827]">{essayFile.name}</div>
                                  <div className="text-[11px] text-gray-500">{(essayFile.size / 1024).toFixed(0)} KB</div>
                                </div>
                              </div>
                              <button onClick={() => setEssayFile(null)} className="text-gray-400 hover:text-[#111827] transition-colors">
                                <X size={18} strokeWidth={1.5} />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="border border-dashed border-gray-200 rounded-[12px] p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#1A96F3] bg-[#F9FAFB]/50"
                              onClick={() => document.getElementById('essay-input').click()}
                            >
                              <div className="w-6 h-6 bg-[#E3F2FD] rounded-md flex items-center justify-center text-[#1A96F3] mb-1">
                                <Upload size={12} />
                              </div>
                              <div className="text-[10px] text-gray-600">
                                Drag & Drop Or <span className="text-[#1A96F3] font-bold underline">Browse</span>
                              </div>
                              <p className="text-[8px] text-gray-400 mt-0.5 uppercase tracking-tight">PDF, DOCX, JPG, PNG</p>
                              <input id="essay-input" type="file" className="hidden" onChange={(e) => setEssayFile(e.target.files[0])} />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 space-y-2">
                    <button 
                      onClick={() => {
                        if (selectedOption === 'mock') {
                          onStartMock(examType, taskType);
                        } else {
                          setStep(3);
                        }
                      }}
                      disabled={selectedOption === 'upload' ? (!promptFile || !essayFile) : (!examType || !taskType)}
                      className="w-full bg-[#2C3E50] text-white h-[46px] rounded-[10px] text-[15px] font-bold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#34495E]"
                    >
                      {selectedOption === 'upload' ? 'Analyze My Essay' : 'Start Mock Exam'}
                    </button>
                    <button 
                      onClick={resetAndClose}
                      className="w-full border border-gray-200 text-[#2C3E50] h-[46px] rounded-[10px] text-[15px] font-bold flex items-center justify-center transition-all hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 font-sans">
                  {/* Error State */}
                  {gradingError ? (
                    <div className="w-full text-center space-y-4 py-4">
                      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <h2 className="text-[18px] font-bold text-[#111827]">Grading Failed</h2>
                      <p className="text-[13px] text-gray-500 max-w-[280px] mx-auto">{gradingError}</p>
                      <div className="space-y-2 pt-2">
                        <button onClick={() => { setStep(2); setGradingError(null); }} className="w-full bg-[#2C3E50] text-white h-[44px] rounded-[10px] text-[14px] font-bold hover:bg-[#34495E] transition-all">
                          Try Again
                        </button>
                        <button onClick={resetAndClose} className="w-full border border-gray-200 text-[#2C3E50] h-[44px] rounded-[10px] text-[14px] font-bold hover:bg-gray-50 transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                  <>
                  {/* Brain Loading Animation */}
                  <div className="relative w-16 h-16 mb-6">
                    <motion.div 
                      className="absolute inset-0 border-4 border-[#E3F2FD] rounded-full"
                    />
                    <motion.div 
                      className="absolute inset-0 border-4 border-[#1A96F3] rounded-full border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[#1A96F3]">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
                        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-[20px] font-bold text-[#111827] mb-2">AI is grading your essay</h2>
                    <p className="text-[13px] text-gray-500">This takes 45-60 seconds. Please keep this tab open.</p>
                  </div>
                  </>
                  )}

                  {/* Progress Card */}
                  <div className="w-full bg-[#F0F7FF] rounded-[20px] p-5 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[14px] font-bold text-[#111827]">Finalizing Band Score</span>
                      <span className="text-[13px] font-bold text-[#1A96F3]">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200/50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                        className="h-full bg-[#1A96F3] rounded-full"
                      />
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="w-full space-y-3 px-2">
                    {[
                      { label: "Task Response", id: 0 },
                      { label: "Coherence", id: 1 },
                      { label: "Lexical Resource", id: 2 },
                      { label: "Grammatical", id: 3 }
                    ].map((item, idx) => {
                      const isComplete = completedItems.includes(item.id);
                      const isLoading = !isComplete && (completedItems.length === idx);
                      
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          {isComplete ? (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-5 h-5 bg-[#26D07C] rounded-full flex items-center justify-center text-white"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </motion.div>
                          ) : isLoading ? (
                            <div className="relative w-5 h-5">
                              <div className="absolute inset-0 border-2 border-gray-100 rounded-full" />
                              <motion.div 
                                className="absolute inset-0 border-2 border-[#1A96F3] rounded-full border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-100 rounded-full" />
                          )}
                          <span className={`text-[14px] transition-colors duration-300 ${isComplete ? "text-gray-400" : isLoading ? "text-[#111827] font-medium" : "text-gray-300"}`}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PracticeModal;
