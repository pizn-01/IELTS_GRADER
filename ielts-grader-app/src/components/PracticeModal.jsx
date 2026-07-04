import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Clock, Info, ChevronDown, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { extractFileText, UPLOAD_ACCEPT } from '../utils/extractFileText';
import { normalizeParagraphBreaks } from '../utils/normalizeParagraphBreaks';

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });

const isImageFile = (file) =>
  file && (file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.name || ''));


const PracticeModal = ({ isOpen, onClose, onAnalysisComplete, onStartMock }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState('');
  const [taskType, setTaskType] = useState('');
  const [showExamDropdown, setShowExamDropdown] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [selectedOption, setSelectedOption] = useState('upload'); // 'upload' or 'mock'
  const [questionText, setQuestionText] = useState('');
  const [essayText, setEssayText] = useState('');
  const [questionFile, setQuestionFile] = useState(null);
  const [essayFile, setEssayFile] = useState(null);
  const [fileReadError, setFileReadError] = useState('');
  const [detectedLabel, setDetectedLabel] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [questionChartImage, setQuestionChartImage] = useState(null);
  const [chartNote, setChartNote] = useState('');

  // Grading state
  const [gradingProgress, setGradingProgress] = useState(0);
  const [completedItems, setCompletedItems] = useState([]);
  const [gradingError, setGradingError] = useState('');
  const pollRef = useRef(null);
  const progressRef = useRef(0);
  const progressIntervalRef = useRef(null);
  const promptFileInputRef = useRef(null);
  const essayFileInputRef = useRef(null);
  const examDropdownRef = useRef(null);
  const taskDropdownRef = useRef(null);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const handleEssayFileSelect = async (file) => {
    if (!file) return;
    setFileReadError('');
    setExtracting(true);
    try {
      const text = normalizeParagraphBreaks(await extractFileText(file));
      setEssayFile(file);
      setEssayText(text);
    } catch (err) {
      setFileReadError(err.message || 'Could not read file. Please upload a PDF, DOCX, or image (JPG/PNG).');
    } finally {
      setExtracting(false);
    }
  };

  const handleQuestionFileSelect = async (file) => {
    if (!file) return;
    setFileReadError('');
    setExtracting(true);
    setChartNote('');
    try {
      // Keep original image for Task 1 report chart grading (not shown in text box).
      if (isImageFile(file)) {
        try {
          setQuestionChartImage(await readAsDataURL(file));
        } catch {
          setQuestionChartImage(null);
        }
      } else {
        setQuestionChartImage(null);
      }
      const text = normalizeParagraphBreaks(await extractFileText(file));
      setQuestionFile(file);
      setQuestionText(text);
    } catch (err) {
      setFileReadError(err.message || 'Could not read the question file.');
    } finally {
      setExtracting(false);
    }
  };

  const removeEssayFile = () => {
    setEssayFile(null);
    setEssayText('');
    setFileReadError('');
  };

  const removeQuestionFile = () => {
    setQuestionFile(null);
    setQuestionText('');
    setQuestionChartImage(null);
    setChartNote('');
  };

  // Start the smooth visual progress animation (0 → 88%, then real status drives to 100%)
  const startProgressAnimation = () => {
    progressRef.current = 0;
    setGradingProgress(0);
    setCompletedItems([]);
    progressIntervalRef.current = setInterval(() => {
      if (progressRef.current < 88) {
        progressRef.current = Math.min(88, progressRef.current + 2);
        const p = Math.round(progressRef.current);
        setGradingProgress(p);
        if (p > 25) setCompletedItems(prev => prev.includes(0) ? prev : [...prev, 0]);
        if (p > 50) setCompletedItems(prev => prev.includes(1) ? prev : [...prev, 1]);
        if (p > 75) setCompletedItems(prev => prev.includes(2) ? prev : [...prev, 2]);
      }
    }, 200);
  };

  const stopProgressAnimation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleAnalyzeEssay = async () => {
    if (wordCount < 10) return;

    setStep(3);
    setGradingError('');
    setDetectedLabel('');
    startProgressAnimation();

    let submissionId;
    try {
      const detectSource = (questionText || essayText).trim();
      if (!detectSource) {
        throw new Error('Please provide your essay (and ideally the question prompt).');
      }
      const detected = await api.detectTask(detectSource);
      const resolvedExam = detected.exam_type;
      const resolvedTask = detected.task_type;
      setExamType(resolvedExam);
      setTaskType(resolvedTask);
      setDetectedLabel(`${resolvedExam} ${resolvedTask}`);

      const promptForGrading = normalizeParagraphBreaks(
        (questionText || detected.prompt || '').trim(),
      );
      const essayForGrading = normalizeParagraphBreaks(essayText);

      if (detected.task === 'task1-report' && questionChartImage) {
        setChartNote('Chart image will be used for data-accuracy grading.');
      } else {
        setChartNote('');
      }

      const res = await api.submitAttempt({
        exam_type: resolvedExam,
        task_type: resolvedTask,
        essay_content: essayForGrading,
        question_text: promptForGrading,
        bullet_points: detected.bulletPoints || [],
        letter_type: detected.letterType || undefined,
        opening_line: detected.openingLine || undefined,
        chart_type: detected.chartType || undefined,
        chart_image:
          detected.task === 'task1-report' && questionChartImage
            ? questionChartImage
            : undefined,
        time_spent_seconds: 0,
      });
      submissionId = res.submission_id;
    } catch (err) {
      stopProgressAnimation();
      if (err.message && err.message.includes('Insufficient evaluation credits')) {
        navigate('/analysis-ready', { state: { outOfCredits: true } });
        return;
      }
      setGradingError(err.message || 'Submission failed. Please check your credits and try again.');
      return;
    }

    // Poll until graded
    let attempts = 0;
    const maxAttempts = 40; // ~2 min at 3s intervals

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { status } = await api.checkStatus(submissionId);

        if (status === 'graded') {
          clearInterval(pollRef.current);
          stopProgressAnimation();
          setGradingProgress(100);
          setCompletedItems([0, 1, 2, 3]);

          setTimeout(async () => {
            try {
              const report = await api.getReport(submissionId);
              onAnalysisComplete(submissionId, report);
            } catch {
              onAnalysisComplete(submissionId, null);
            }
          }, 800);
        } else if (status === 'failed' || attempts >= maxAttempts) {
          clearInterval(pollRef.current);
          stopProgressAnimation();
          setGradingError('Grading failed. Your credit has been refunded. Please try again.');
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(pollRef.current);
          stopProgressAnimation();
          setGradingError('Connection lost. Please refresh and try again.');
        }
      }
    }, 3000);
  };

  const resetAndClose = () => {
    // Cleanup
    if (pollRef.current) clearInterval(pollRef.current);
    stopProgressAnimation();

    setStep(1);
    setEssayText('');
    setQuestionText('');
    setEssayFile(null);
    setQuestionFile(null);
    setFileReadError('');
    setExamType('');
    setTaskType('');
    setGradingProgress(0);
    setCompletedItems([]);
    setGradingError('');
    setShowExamDropdown(false);
    setShowTaskDropdown(false);
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

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopProgressAnimation();
    };
  }, []);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(e.target)) setShowExamDropdown(false);
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target)) setShowTaskDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 3 ? undefined : resetAndClose}
            className="absolute inset-0 bg-[#00000066] backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white w-full max-w-[480px] max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Close Button — hidden during grading */}
            {step !== 3 && (
              <button
                onClick={resetAndClose}
                className="absolute top-5 right-6 text-gray-400 hover:text-[#111827] transition-colors z-10"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            )}

            <div className="flex-1 min-h-0 p-6 sm:p-8 font-sans overflow-y-auto">
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
                        Paste your question and essay for instant AI grading
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
                        Practice in a real IELTS computer-based environment with timer
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
                    {/* Mock exam still needs manual exam/task selection */}
                    {selectedOption === 'mock' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[12px] font-bold text-[#111827]">Exam Type</label>
                          <div ref={examDropdownRef}>
                            <button
                              type="button"
                              onClick={() => { setShowExamDropdown(v => !v); setShowTaskDropdown(false); }}
                              className="w-full bg-white border border-gray-200 rounded-[10px] px-4 h-[44px] flex items-center justify-between text-[13px] focus:border-[#1A96F3] transition-colors font-medium"
                            >
                              <span className={examType ? 'text-[#111827]' : 'text-gray-400'}>{examType || 'Select'}</span>
                              <ChevronDown className={`text-gray-400 transition-transform duration-200 ${showExamDropdown ? 'rotate-180' : ''}`} size={16} />
                            </button>
                            {showExamDropdown && (
                              <div className="mt-1 bg-white border border-gray-200 rounded-[10px] overflow-hidden shadow-md">
                                {['Academic', 'General'].map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { setExamType(opt); setShowExamDropdown(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-gray-50 ${examType === opt ? 'text-[#1A96F3] font-bold bg-blue-50/40' : 'text-[#111827] font-medium'}`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[12px] font-bold text-[#111827]">Task Type</label>
                          <div ref={taskDropdownRef}>
                            <button
                              type="button"
                              onClick={() => { setShowTaskDropdown(v => !v); setShowExamDropdown(false); }}
                              className="w-full bg-white border border-gray-200 rounded-[10px] px-4 h-[44px] flex items-center justify-between text-[13px] focus:border-[#1A96F3] transition-colors font-medium"
                            >
                              <span className={taskType ? 'text-[#111827]' : 'text-gray-400'}>{taskType || 'Select'}</span>
                              <ChevronDown className={`text-gray-400 transition-transform duration-200 ${showTaskDropdown ? 'rotate-180' : ''}`} size={16} />
                            </button>
                            {showTaskDropdown && (
                              <div className="mt-1 bg-white border border-gray-200 rounded-[10px] overflow-hidden shadow-md">
                                {['Task 1', 'Task 2'].map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { setTaskType(opt); setShowTaskDropdown(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-gray-50 ${taskType === opt ? 'text-[#1A96F3] font-bold bg-blue-50/40' : 'text-[#111827] font-medium'}`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedOption === 'upload' && (
                      <>
                        <p className="text-[12px] text-gray-500">
                          Task type is detected automatically from your question prompt (or essay if no prompt is provided).
                        </p>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-[#111827]">
                            Your Question / Prompt <span className="text-gray-400 font-normal">(recommended)</span>
                          </label>
                          <div className="relative">
                            <textarea
                              value={questionText}
                              onChange={(e) => setQuestionText(e.target.value)}
                              placeholder="Type, paste, or upload PDF / DOCX / image (paragraphs preserved)"
                              rows={3}
                              className="w-full min-h-[72px] px-4 py-2.5 pr-11 bg-white border border-gray-200 rounded-[10px] text-[13px] text-[#111827] placeholder-gray-300 outline-none focus:border-[#1A96F3] transition-colors resize-y"
                            />
                            <button
                              type="button"
                              onClick={() => promptFileInputRef.current?.click()}
                              disabled={extracting}
                              className="absolute right-3 top-3 text-gray-500 hover:text-[#111827] transition-colors p-0.5 disabled:opacity-40"
                            >
                              <Paperclip size={16} />
                            </button>
                            <input
                              ref={promptFileInputRef}
                              type="file"
                              accept={UPLOAD_ACCEPT}
                              className="hidden"
                              onChange={(e) => {
                                handleQuestionFileSelect(e.target.files[0]);
                                e.target.value = '';
                              }}
                            />
                          </div>
                          {questionChartImage && (
                            <p className="text-[11px] text-[#059669]">
                              Question image retained for chart grading (not shown in the text box).
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-[#111827]">Your Essay</label>
                          <div className="relative">
                            <textarea
                              value={essayText}
                              onChange={(e) => setEssayText(e.target.value)}
                              placeholder="Type, paste, or upload PDF / DOCX / image (paragraphs preserved)"
                              rows={5}
                              className="w-full min-h-[120px] px-4 py-2.5 pr-11 bg-white border border-gray-200 rounded-[10px] text-[13px] text-[#111827] placeholder-gray-300 outline-none focus:border-[#1A96F3] transition-colors resize-y"
                            />
                            <button
                              type="button"
                              onClick={() => essayFileInputRef.current?.click()}
                              disabled={extracting}
                              className="absolute right-3 top-3 text-gray-500 hover:text-[#111827] transition-colors p-0.5 disabled:opacity-40"
                            >
                              <Paperclip size={16} />
                            </button>
                            <input
                              ref={essayFileInputRef}
                              type="file"
                              accept={UPLOAD_ACCEPT}
                              className="hidden"
                              onChange={(e) => {
                                handleEssayFileSelect(e.target.files[0]);
                                e.target.value = '';
                              }}
                            />
                          </div>
                          {extracting && (
                            <p className="text-[11px] text-[#1A96F3] mt-1">Reading file…</p>
                          )}
                          {fileReadError && (
                            <p className="text-[11px] text-red-500 mt-1">{fileReadError}</p>
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
                          handleAnalyzeEssay();
                        }
                      }}
                      disabled={
                        selectedOption === 'upload'
                          ? (wordCount < 10 || extracting)
                          : (!examType || !taskType)
                      }
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
                /* Step 3 — Real grading in progress */
                <div className="flex flex-col items-center py-6 font-sans">
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

                  {detectedLabel && !gradingError && (
                    <p className="text-[12px] font-semibold text-[#1A96F3] mb-2">
                      Detected: {detectedLabel}
                    </p>
                  )}
                  {chartNote && !gradingError && (
                    <p className="text-[11px] text-[#059669] mb-2">{chartNote}</p>
                  )}
                  {gradingError ? (
                    <div className="w-full space-y-4 text-center">
                      <h2 className="text-[18px] font-bold text-[#111827]">Grading Failed</h2>
                      <p className="text-[13px] text-red-500 leading-relaxed">{gradingError}</p>
                      <button
                        onClick={() => {
                          setGradingError('');
                          setStep(2);
                        }}
                        className="w-full bg-[#2C3E50] text-white h-[46px] rounded-[10px] text-[15px] font-bold"
                      >
                        Go Back & Try Again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-[20px] font-bold text-[#111827] mb-2">AI is grading your essay</h2>
                        <p className="text-[13px] text-gray-500">This takes 45–60 seconds. Please keep this tab open.</p>
                      </div>

                      {/* Progress Card */}
                      <div className="w-full bg-[#F0F7FF] rounded-[20px] p-5 mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[14px] font-bold text-[#111827]">Finalizing Band Score</span>
                          <span className="text-[13px] font-bold text-[#1A96F3]">{gradingProgress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${gradingProgress}%` }}
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
                    </>
                  )}
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
