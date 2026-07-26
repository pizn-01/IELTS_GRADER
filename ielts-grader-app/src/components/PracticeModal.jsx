import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCheck2, Clock, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showFreeTrialEvalMessage } from '../constants/subscriptionPlans';
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


const MOCK_OPTIONS = [
  { examType: 'Academic', taskType: 'Task 1', label: 'Task 1', sublabel: 'Report' },
  { examType: 'Academic', taskType: 'Task 2', label: 'Task 2', sublabel: 'Essay' },
  { examType: 'General', taskType: 'Task 1', label: 'Task 1', sublabel: 'Letter' },
  { examType: 'General', taskType: 'Task 2', label: 'Task 2', sublabel: 'Essay' },
];

const PracticeModal = ({ isOpen, onClose, onAnalysisComplete, onStartMock, onStartGrade }) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const hasCredits = (Number(user?.credits_remaining) || 0) > 0;
  const isFreeTrialOffer = showFreeTrialEvalMessage(user);
  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState('');
  const [taskType, setTaskType] = useState('');
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

  const redirectIfNoCredits = async () => {
    try {
      const fresh = await api.getMe();
      updateUser({
        credits_remaining: fresh.credits_remaining,
        credits_allowance: fresh.credits_allowance,
      });
      if ((Number(fresh.credits_remaining) || 0) <= 0) {
        onClose?.();
        navigate('/analysis-ready', { state: { outOfCredits: true } });
        return true;
      }
      return false;
    } catch {
      // Fail closed — do not allow practice if credits cannot be verified
      onClose?.();
      navigate('/analysis-ready', { state: { outOfCredits: true } });
      return true;
    }
  };

  const handleAnalyzeEssay = async () => {
    if (wordCount < 10) return;
    if (await redirectIfNoCredits()) return;

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

    // Poll until graded (python mega-batch can exceed 2 minutes)
    let attempts = 0;
    const maxAttempts = 100; // ~5 min at 3s intervals

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
          if (status === 'failed') {
            setGradingError('Grading failed. Your credit has been refunded. Please try again.');
          } else {
            setGradingError('Grading is taking longer than expected. Please check Reports in a few minutes before submitting again — your credit is only refunded if grading fails.');
          }
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
                    <h2 className="text-[18px] font-bold text-[#1a1f36]">
                      {isFreeTrialOffer ? 'Start your free tutor report' : 'Start your tutor report'}
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => onStartGrade?.()}
                      className="group relative flex items-center gap-3.5 text-left rounded-[14px] border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] p-4 min-h-[96px] cursor-pointer transition-all active:scale-[0.98] hover:border-[#3B82F6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)]"
                    >
                      <div className="flex shrink-0">
                        <div className="w-12 h-12 rounded-[12px] flex items-center justify-center bg-white shadow-sm border border-[#BFDBFE]/60">
                          <FileCheck2 className="w-6 h-6 text-[#3B82F6]" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[15px] font-bold text-[#1a1f36]">Grade my essay</span>
                          <Info size={14} className="text-[#9CA3AF] group-hover:text-[#3B82F6] transition-colors" />
                        </div>
                        <p className="text-[12px] text-[#6B7280] leading-snug m-0">
                          Paste or upload your essay for a band score and fixes
                        </p>
                      </div>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3B82F6]/70 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="group relative flex items-center gap-3.5 text-left rounded-[14px] border border-[#99F6E4] bg-gradient-to-r from-[#F0FDFA] to-[#F8FAFC] p-4 min-h-[96px] cursor-pointer transition-all active:scale-[0.98] hover:border-[#2DD4BF] hover:shadow-[0_8px_24px_rgba(45,212,191,0.12)]"
                    >
                      <div className="flex shrink-0">
                        <div className="w-12 h-12 rounded-[12px] flex items-center justify-center bg-white shadow-sm border border-[#99F6E4]/60">
                          <Clock className="w-6 h-6 text-[#0D9488]" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[15px] font-bold text-[#1a1f36]">Mock Exam</span>
                          <Info size={14} className="text-[#9CA3AF] group-hover:text-[#0D9488] transition-colors" />
                        </div>
                        <p className="text-[12px] text-[#6B7280] leading-snug m-0">
                          Practice in a real IELTS computer-based environment with timer
                        </p>
                      </div>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]/70 shrink-0" />
                    </button>
                  </div>

                  <p className="text-center text-[12px] text-[#9CA3AF] mt-5 mb-0">
                    {isFreeTrialOffer
                      ? '3 free evaluations · Results in about 60 seconds'
                      : 'Results in about 60 seconds'}
                  </p>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={resetAndClose}
                      className="w-full border border-gray-200 text-[#2C3E50] h-[46px] rounded-[10px] text-[15px] font-bold flex items-center justify-center transition-all hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : step === 2 ? (
                <div className="flex flex-col font-sans h-full">
                  <div className="mb-4">
                    <h2 className="text-[18px] font-bold text-[#111827]">Mock Exam</h2>
                    <p className="text-[12px] text-gray-500 m-0 mt-1">Pick a task to start timed practice</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                    {MOCK_OPTIONS.map((opt) => {
                      const isAcademic = opt.examType === 'Academic';
                      return (
                        <button
                          key={`${opt.examType}-${opt.taskType}`}
                          type="button"
                          onClick={async () => {
                            if (await redirectIfNoCredits()) return;
                            onStartMock(opt.examType, opt.taskType);
                          }}
                          className={`group text-left rounded-[12px] border p-3.5 min-h-[88px] cursor-pointer transition-all active:scale-[0.98] hover:shadow-md flex flex-col justify-center ${
                            isAcademic
                              ? 'border-[#BFDBFE] bg-gradient-to-b from-[#EFF6FF] to-white hover:border-[#3B82F6]'
                              : 'border-[#99F6E4] bg-gradient-to-b from-[#F0FDFA] to-white hover:border-[#2DD4BF]'
                          }`}
                        >
                          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isAcademic ? 'text-[#3B82F6]' : 'text-[#0D9488]'}`}>
                            {opt.examType}
                          </p>
                          <p className="text-[14px] font-bold text-[#111827] mb-0 leading-tight">
                            {opt.label}
                          </p>
                          <p className="text-[12px] text-gray-500 m-0 mt-0.5">{opt.sublabel}</p>
                          <ChevronRight className={`w-4 h-4 mt-2 transition-transform group-hover:translate-x-0.5 ${isAcademic ? 'text-[#3B82F6]' : 'text-[#0D9488]'}`} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <button 
                      onClick={() => setStep(1)}
                      className="w-full border border-gray-200 text-[#2C3E50] h-[46px] rounded-[10px] text-[15px] font-bold flex items-center justify-center transition-all hover:bg-gray-50"
                    >
                      Back
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
