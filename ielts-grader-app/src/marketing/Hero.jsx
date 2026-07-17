import React, { useState, useRef } from 'react';
import { FileCheck2, Clock, Info, Star, Zap, ShieldCheck, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';
import { useGrade } from '../context/GradeContext';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { extractFileText, UPLOAD_ACCEPT } from '../utils/extractFileText';
import { normalizeParagraphBreaks } from '../utils/normalizeParagraphBreaks';
import { setPendingGradePayload } from '../utils/authStorage';

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
  { examType: 'Academic', taskType: 'Task 1', label: 'Academic · Task 1', sublabel: 'Report' },
  { examType: 'Academic', taskType: 'Task 2', label: 'Academic · Task 2', sublabel: 'Essay' },
  { examType: 'General', taskType: 'Task 1', label: 'General · Task 1', sublabel: 'Letter' },
  { examType: 'General', taskType: 'Task 2', label: 'General · Task 2', sublabel: 'Essay' },
];

const Hero = () => {
  const navigate = useNavigate();
  const { essayData, updateEssayData, setGradingStatus, setSubmissionId } = useGrade();
  const { user } = useAuth();
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [cardView, setCardView] = useState('default'); // 'default', 'mock', 'upload'
  const [files, setFiles] = useState({ prompt: null, essay: null });

  const tooltips = {
    essay: { text: "Paste or upload your IELTS essay (and optional question prompt) to get criterion scores and fixes." },
    mock: { text: "Practice under exam conditions to simulate a real computer-based IELTS environment." }
  };

  const Tooltip = ({ text }) => (
    <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[240px] bg-[#1a1f36] rounded-lg p-4 shadow-2xl z-50 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      <p className="m-0 text-[13px] leading-relaxed font-normal text-white opacity-95">{text}</p>
      <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 rotate-45 w-[10px] h-[10px] bg-[#1a1f36]"></div>
    </div>
  );

  const [fileReadError, setFileReadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [essayText, setEssayText] = useState('');
  const [questionChartImage, setQuestionChartImage] = useState(null);
  const promptFileRef = useRef(null);
  const essayFileRef = useRef(null);

  const handleFileChange = (type, file) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    updateEssayData({ [`${type}File`]: file });
  };

  const removeFile = (type) => {
    setFiles(prev => ({ ...prev, [type]: null }));
    updateEssayData({ [`${type}File`]: null });
    if (type === 'essay') updateEssayData({ essayContent: '' });
    if (type === 'prompt') updateEssayData({ questionContent: '' });
  };

  const isUploadFormValid = essayText.trim().length > 0;

  const handleStartMock = (examType, taskType) => {
    if (user && (user.credits_remaining ?? 0) <= 0) {
      navigate('/analysis-ready', { state: { outOfCredits: true } });
      return;
    }
    updateEssayData({ examType, taskType });
    navigate('/mock-exam');
  };

  return (
    <header
      id="about"
      className="hero-mobile-wash relative box-border overflow-hidden flex flex-col pt-6 pb-3 lg:py-12 lg:items-center lg:justify-center min-h-[calc(100dvh-64px)] lg:min-h-[700px]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[100px] w-full flex-1 flex flex-col lg:flex-none lg:flex-row lg:items-stretch gap-0 lg:gap-14">

        {/* Mobile: compact headline above the card */}
        <div className="w-full order-1 lg:hidden animate-fadeInUp text-center shrink-0 mb-5">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-[#FFFBEB]/80 border border-[#FDE68A]/70 rounded-full text-[11px] font-medium text-[#92400E]/90 mb-3 tracking-wide">
            Free · No card
          </div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-[#1a1f36] leading-[1.2] tracking-[-0.03em] m-0 font-['Nunito',_sans-serif]">
            Your IELTS Writing Tutor.<br />
            <span className="font-semibold text-[#374151]">
              Band scores in <span className="text-[#3B82F6]">60 seconds.</span>
            </span>
          </h1>
        </div>

        {/* Submission card — first interactive surface on mobile */}
        <div className="w-full order-2 lg:order-2 lg:w-[45%] flex flex-col items-center lg:items-stretch animate-fadeInUp animate-delay-50 shrink-0 mb-2.5 lg:mb-0">
          <div className="bg-white/95 rounded-[18px] border border-[#E8ECF1] shadow-[0_12px_40px_rgba(26,31,54,0.06)] p-5 pb-6 lg:p-8 w-full max-w-[480px] lg:max-w-none lg:h-full flex flex-col transition-all duration-500">
            
            {cardView === 'default' ? (
              <div className="flex-1 flex flex-col animate-fadeIn min-h-0">
                <h3 className="text-[17px] lg:text-[20px] font-bold text-[#1a1f36] mb-4 lg:mb-6 tracking-[-0.01em]">Start your free tutor report</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 flex-1 min-h-0">
                  <button
                    type="button"
                    onClick={() => setCardView('upload')}
                    className="group relative flex items-center gap-3.5 lg:flex-col lg:justify-center lg:gap-0 text-left lg:text-center rounded-[14px] border border-[#BFDBFE] bg-gradient-to-b from-[#EFF6FF] to-[#F8FAFC] p-4 lg:p-6 min-h-[104px] lg:min-h-0 lg:h-full cursor-pointer transition-all active:scale-[0.98] hover:border-[#3B82F6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)]"
                  >
                    <div className="flex shrink-0 lg:justify-center lg:mb-5 lg:w-full">
                      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-[12px] lg:rounded-[14px] flex items-center justify-center bg-white shadow-sm border border-[#BFDBFE]/60">
                        <FileCheck2 className="w-6 h-6 lg:w-7 lg:h-7 text-[#3B82F6]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 lg:w-full lg:flex-none">
                      <div className="flex items-center gap-2 mb-1 lg:mb-2 lg:justify-center">
                        <span className="text-[15px] lg:text-[17px] font-bold text-[#1a1f36]">Grade my essay</span>
                        <span className="relative flex items-center">
                          <Info
                            onMouseEnter={() => setActiveTooltip('upload')}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[14px] h-[14px] cursor-help text-[#9CA3AF] group-hover:text-[#3B82F6] transition-colors"
                          />
                          {activeTooltip === 'upload' && <Tooltip text={tooltips.essay.text} />}
                        </span>
                      </div>
                      <p className="text-[12px] lg:text-[14px] text-[#6B7280] leading-snug lg:leading-relaxed m-0 lg:mx-auto lg:max-w-[220px]">
                        Paste or upload your essay for a band score and fixes
                      </p>
                    </div>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3B82F6]/70 lg:static lg:translate-y-0 lg:mt-6 lg:mx-auto shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardView('mock')}
                    className="group relative flex items-center gap-3.5 lg:flex-col lg:justify-center lg:gap-0 text-left lg:text-center rounded-[14px] border border-[#99F6E4] bg-gradient-to-b from-[#F0FDFA] to-[#F8FAFC] p-4 lg:p-6 min-h-[104px] lg:min-h-0 lg:h-full cursor-pointer transition-all active:scale-[0.98] hover:border-[#2DD4BF] hover:shadow-[0_8px_24px_rgba(45,212,191,0.12)]"
                  >
                    <div className="flex shrink-0 lg:justify-center lg:mb-5 lg:w-full">
                      <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-[12px] lg:rounded-[14px] flex items-center justify-center bg-white shadow-sm border border-[#99F6E4]/60">
                        <Clock className="w-6 h-6 lg:w-7 lg:h-7 text-[#0D9488]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 lg:w-full lg:flex-none">
                      <div className="flex items-center gap-2 mb-1 lg:mb-2 lg:justify-center">
                        <span className="text-[15px] lg:text-[17px] font-bold text-[#1a1f36]">Mock Exam</span>
                        <span className="relative flex items-center">
                          <Info
                            onMouseEnter={() => setActiveTooltip('mock')}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[14px] h-[14px] cursor-help text-[#9CA3AF] group-hover:text-[#0D9488] transition-colors"
                          />
                          {activeTooltip === 'mock' && <Tooltip text={tooltips.mock.text} />}
                        </span>
                      </div>
                      <p className="text-[12px] lg:text-[14px] text-[#6B7280] leading-snug lg:leading-relaxed m-0 lg:mx-auto lg:max-w-[220px]">
                        <span className="lg:hidden">Timed IELTS-style practice</span>
                        <span className="hidden lg:inline">Practice in a real IELTS computer-based environment with timer</span>
                      </p>
                    </div>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]/70 lg:static lg:translate-y-0 lg:mt-6 lg:mx-auto shrink-0" />
                  </button>
                </div>

                <p className="hidden lg:block text-center text-[13px] text-[#9CA3AF] mt-6 mb-0">
                  1 free evaluation · No credit card · Results in about 60 seconds
                </p>
              </div>
            ) : cardView === 'mock' ? (
              <div className="flex-1 flex flex-col animate-fadeIn min-h-0">
                <div className="flex items-center gap-3 mb-4 lg:mb-6">
                  <button type="button" onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
                  </button>
                  <div>
                    <h3 className="text-[18px] font-bold text-[#1a1f36]">Mock Exam</h3>
                    <p className="text-[12px] text-[#6B7280] m-0 mt-0.5">Pick a task to start timed practice</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 flex-1 min-h-0">
                  {MOCK_OPTIONS.map((opt) => {
                    const isAcademic = opt.examType === 'Academic';
                    return (
                      <button
                        key={`${opt.examType}-${opt.taskType}`}
                        type="button"
                        onClick={() => handleStartMock(opt.examType, opt.taskType)}
                        className={`group text-left rounded-[12px] border p-4 lg:p-5 lg:h-full min-h-[88px] lg:min-h-0 cursor-pointer transition-all active:scale-[0.98] hover:shadow-md flex flex-col justify-center ${
                          isAcademic
                            ? 'border-[#BFDBFE] bg-gradient-to-b from-[#EFF6FF] to-white hover:border-[#3B82F6]'
                            : 'border-[#99F6E4] bg-gradient-to-b from-[#F0FDFA] to-white hover:border-[#2DD4BF]'
                        }`}
                      >
                        <p className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${isAcademic ? 'text-[#3B82F6]' : 'text-[#0D9488]'}`}>
                          {opt.examType}
                        </p>
                        <p className="text-[14px] lg:text-[15px] font-bold text-[#1a1f36] mb-0.5 leading-tight">
                          {opt.label}
                        </p>
                        <p className="text-[12px] text-[#6B7280] m-0">{opt.sublabel}</p>
                        <ChevronRight className={`w-4 h-4 mt-2 lg:mt-3 transition-transform group-hover:translate-x-0.5 ${isAcademic ? 'text-[#3B82F6]' : 'text-[#0D9488]'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <button type="button" onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
                  </button>
                  <h3 className="text-[18px] font-bold text-[#1a1f36]">Grade my essay</h3>
                </div>

                <div className="space-y-4 flex-1">
                  <p className="text-[12px] text-[#6B7280]">
                    Task type is detected automatically from your question prompt (or essay if no prompt is provided).
                  </p>

                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">
                      Your Question / Prompt <span className="text-[#9CA3AF] font-normal">(recommended)</span>
                    </label>
                    <div className="relative">
                      <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Type, paste, or upload PDF / DOCX / image (paragraphs preserved)"
                        rows={3}
                        className="w-full min-h-[72px] px-4 py-2.5 pr-11 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y"
                      />
                      <button
                        type="button"
                        onClick={() => promptFileRef.current?.click()}
                        className="absolute right-3 top-3 text-[#6B7280] hover:text-[#1a1f36] transition-colors p-0.5"
                      >
                        <Paperclip size={16} />
                      </button>
                      <input
                        ref={promptFileRef}
                        type="file"
                        accept={UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          e.target.value = '';
                          if (!file) return;
                          setFileReadError('');
                          try {
                            if (isImageFile(file)) {
                              setQuestionChartImage(await readAsDataURL(file));
                            } else {
                              setQuestionChartImage(null);
                            }
                            const text = normalizeParagraphBreaks(await extractFileText(file));
                            setQuestionText(text.trim());
                          } catch (err) {
                            setFileReadError(err.message || 'Could not read the question file.');
                          }
                        }}
                      />
                    </div>
                    {questionChartImage && (
                      <p className="text-[11px] text-[#059669] mt-1">
                        Question image retained for chart grading (not shown in the text box).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Your Essay</label>
                    <div className="relative">
                      <textarea
                        value={essayText}
                        onChange={(e) => setEssayText(e.target.value)}
                        placeholder="Type, paste, or upload PDF / DOCX / image (paragraphs preserved)"
                        rows={5}
                        className="w-full min-h-[120px] px-4 py-2.5 pr-11 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y"
                      />
                      <button
                        type="button"
                        onClick={() => essayFileRef.current?.click()}
                        className="absolute right-3 top-3 text-[#6B7280] hover:text-[#1a1f36] transition-colors p-0.5"
                      >
                        <Paperclip size={16} />
                      </button>
                      <input
                        ref={essayFileRef}
                        type="file"
                        accept={UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          e.target.value = '';
                          if (!file) return;
                          setFileReadError('');
                          try {
                            const text = normalizeParagraphBreaks(await extractFileText(file));
                            setEssayText(text.trim());
                          } catch (err) {
                            setFileReadError(err.message || 'Could not read file.');
                          }
                        }}
                      />
                    </div>
                    {fileReadError && (
                      <p className="text-[11px] text-red-500 mt-1">{fileReadError}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!essayText.trim()) return;
                    setFileReadError('');
                    setIsSubmitting(true);
                    try {
                      const detectSource = (questionText || essayText).trim();
                      const detected = await api.detectTask(detectSource);
                      const promptForGrading = normalizeParagraphBreaks(
                        (questionText || detected.prompt || '').trim(),
                      );
                      const essayForGrading = normalizeParagraphBreaks(essayText);
                      const gradePayload = {
                        essayContent: essayForGrading,
                        questionContent: promptForGrading,
                        examType: detected.exam_type,
                        taskType: detected.task_type,
                        bulletPoints: detected.bulletPoints || [],
                        letterType: detected.letterType || null,
                        openingLine: detected.openingLine || '',
                        chartType: detected.chartType || null,
                        taskVariant: detected.task || null,
                        chartImage:
                          detected.task === 'task1-report' ? questionChartImage : null,
                        timeSpentSeconds: 0,
                      };
                      updateEssayData(gradePayload);

                      if (!user) {
                        setPendingGradePayload(gradePayload);
                        setIsSubmitting(false);
                        navigate('/login', {
                          state: { from: { pathname: '/analysis-ready' } },
                        });
                        return;
                      }
                      if (user.credits_remaining > 0) {
                        const res = await api.submitAttempt({
                          exam_type: detected.exam_type,
                          task_type: detected.task_type,
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
                        setSubmissionId(res.submission_id);
                        setGradingStatus('processing');
                        navigate('/analysis-ready');
                      } else {
                        navigate('/analysis-ready');
                      }
                    } catch (err) {
                      if (err.message && err.message.includes('Insufficient evaluation credits')) {
                        navigate('/analysis-ready', { state: { outOfCredits: true } });
                      } else {
                        setFileReadError(err.message || 'Submission failed. Please try again.');
                        setIsSubmitting(false);
                      }
                    }
                  }}
                  disabled={!isUploadFormValid || isSubmitting}
                  className={`w-full h-[50px] rounded-[10px] font-bold text-[15px] mt-6 transition-all ${
                    isUploadFormValid && !isSubmitting
                      ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46] shadow-lg'
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Analyzing…' : user ? 'Analyze My Essay' : 'Get my free tutor report'}
                </button>
                {!user && (
                  <p className="text-[12px] text-[#6B7280] text-center mt-3">
                    Free account includes 1 full evaluation. No card required.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: composed rating + benefits fill remaining viewport */}
        <div className="lg:hidden order-3 flex-1 flex flex-col justify-center gap-3.5 w-full max-w-[480px] mx-auto px-5 pt-1 pb-1 animate-fadeInUp animate-delay-150">
          <div className="flex items-center gap-1.5 shrink-0 pb-3 mb-0.5 border-b border-[#E8ECF1]/90">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 text-[#F59E0B]" fill="#F59E0B" />
              ))}
            </div>
            <span className="text-[13px] font-bold text-[#1a1f36]">4.9/5</span>
            <span className="text-[12px] text-[#9CA3AF]">· 2,400+ reviews</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] whitespace-nowrap">
            <Star className="w-[17px] h-[17px] text-[#3B82F6] shrink-0" strokeWidth={2} />
            <span>1 free full report, no credit card</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] whitespace-nowrap">
            <Zap className="w-[17px] h-[17px] text-[#3B82F6] shrink-0" strokeWidth={2} />
            <span>Criterion scores + fixes, not just a band</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] whitespace-nowrap">
            <ShieldCheck className="w-[17px] h-[17px] text-[#3B82F6] shrink-0" strokeWidth={2} />
            <span>Personalized steps to your target band</span>
          </div>
        </div>

        {/* Desktop left copy (hidden on mobile) */}
        <div className="hidden lg:flex w-full order-3 lg:order-1 lg:w-[55%] animate-fadeIn flex-col justify-center">
          <div className="inline-flex items-center self-start px-4 py-1.5 bg-[#FEF9C3] border border-[#FDE68A] rounded-full text-[13px] font-medium text-[#78350F] mb-5">
            1 free evaluation · No card required
          </div>

          <h1 className="text-[44px] font-bold text-[#1a1f36] leading-[1.05] tracking-[-0.03em] mb-6 font-['Nunito',_sans-serif]">
            Your IELTS Writing Tutor.<br />
            Band scores, fixes & a plan in<br />
            <span className="text-[#3B82F6]">60 Seconds.</span>
          </h1>

          <p className="text-[17px] text-[#6B7280] leading-[1.6] mb-8 max-w-[540px]">
            Stop guessing. Sign up free, upload an essay (or take a mock), and get criterion scores, sentence-level corrections, and a clear improvement plan: 1 full evaluation included.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <Star className="w-5 h-5 text-[#F59E0B] shrink-0" fill="#F59E0B" strokeWidth={2} />
              1 free full report, no credit card
            </div>
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <Zap className="w-5 h-5 text-[#2DD4BF] shrink-0" strokeWidth={2} />
              Criterion scores + sentence fixes, not just a band
            </div>
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <ShieldCheck className="w-5 h-5 text-[#2DD4BF] shrink-0" strokeWidth={2} />
              Personalized next steps toward your target band
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[ 'photo-1534528741775-53994a69daeb', 'photo-1506794778202-cad84cf45f1d', 'photo-1494790108377-be9c29b29330', 'photo-1500648767791-00dcc994a43e' ].map((id, i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                  <img src={`https://images.unsplash.com/${id}?w=100&h=100&fit=crop`} alt="User" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-[#F59E0B]" fill="#F59E0B" />)}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#1a1f36]">4.9/5</span>
                <span className="text-[14px] text-[#9CA3AF]">from 2,400+ reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
