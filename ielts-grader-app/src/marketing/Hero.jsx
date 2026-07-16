import React, { useState, useRef } from 'react';
import { FileCheck2, Clock, Info, Star, Zap, ShieldCheck, ChevronDown, ChevronLeft, Paperclip } from 'lucide-react';
import { useGrade } from '../context/GradeContext';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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


const Hero = () => {
  const navigate = useNavigate();
  const { essayData, updateEssayData, setGradingStatus, setSubmissionId } = useGrade();
  const { user } = useAuth();
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
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

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    // Mobile: one tap opens the flow; desktop keeps select → Start
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setCardView(option);
    }
  };

  return (
    <header
      id="about"
      className="hero-mobile-wash relative box-border overflow-hidden flex flex-col pt-5 pb-3 lg:py-12 lg:items-center lg:justify-center min-h-[calc(100dvh-64px)] lg:min-h-[700px]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[100px] w-full flex-1 flex flex-col lg:flex-none lg:flex-row lg:items-center gap-4 lg:gap-20">

        {/* Mobile: compact headline above the card */}
        <div className="w-full order-1 lg:hidden animate-fadeInUp text-center shrink-0">
          <div className="inline-flex items-center px-2.5 py-0.5 bg-[#FFFBEB]/80 border border-[#FDE68A]/70 rounded-full text-[11px] font-medium text-[#92400E]/90 mb-2.5 tracking-wide">
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
        <div className="w-full order-2 lg:order-2 lg:w-[45%] flex flex-col items-center lg:items-end animate-fadeInUp animate-delay-50 shrink-0">
          <div className="bg-white/95 rounded-[18px] border border-[#E8ECF1] shadow-[0_12px_40px_rgba(26,31,54,0.06)] p-4 lg:p-7 w-full max-w-[480px] flex flex-col transition-all duration-500">
            
            {cardView === 'default' ? (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <h3 className="text-[17px] lg:text-[20px] font-bold text-[#1a1f36] mb-3 lg:mb-6 tracking-[-0.01em]">Start your free tutor report</h3>
                
                <div 
                  onClick={() => handleOptionSelect('upload')} 
                  className={`group border rounded-[12px] py-4 px-3.5 min-h-[80px] lg:min-h-0 lg:p-5 mb-3 lg:mb-3 cursor-pointer transition-all active:scale-[0.98] active:bg-[#F8FAFC] relative bg-white flex items-center gap-3.5 text-left lg:flex-col lg:text-center lg:gap-0 ${
                    selectedOption === 'upload' 
                      ? 'border-[#3B82F6] shadow-[0_0_0_3px_rgba(59,130,246,0.08)]' 
                      : 'border-[#E8ECF1] hover:border-[#3B82F6] hover:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                  }`}
                >
                  <div className="flex shrink-0 lg:justify-center lg:mb-3 lg:w-full">
                    <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-[10px] flex items-center justify-center transition-colors bg-[#EFF6FF]">
                      <FileCheck2 className="w-5 h-5 transition-colors text-[#3B82F6]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 lg:w-full">
                    <div className="flex items-center gap-2 mb-1 lg:mb-1 lg:justify-center">
                      <span className={`text-[15px] lg:text-[16px] font-bold transition-colors ${selectedOption === 'upload' ? 'text-[#1a1f36]' : 'text-[#374151] group-hover:text-[#1a1f36]'}`}>Grade my essay</span>
                      <span className="relative flex items-center">
                        <Info 
                          onMouseEnter={() => setActiveTooltip('upload')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-[14px] h-[14px] cursor-help transition-colors ${selectedOption === 'upload' ? 'text-[#3B82F6]' : 'text-[#9CA3AF] group-hover:text-[#3B82F6]'}`} 
                        />
                        {activeTooltip === 'upload' && <Tooltip text={tooltips.essay.text} />}
                      </span>
                    </div>
                    <p className="text-[12px] lg:text-[13px] text-[#9CA3AF] leading-snug lg:leading-relaxed max-w-[320px] m-0 lg:mx-auto">Paste or upload your essay for a band score and fixes</p>
                  </div>
                </div>

                <div 
                  onClick={() => handleOptionSelect('mock')} 
                  className={`group border rounded-[12px] py-4 px-3.5 min-h-[80px] lg:min-h-0 lg:p-5 mb-0 lg:mb-3 cursor-pointer transition-all active:scale-[0.98] active:bg-[#F8FAFC] relative bg-white flex items-center gap-3.5 text-left lg:flex-col lg:text-center lg:gap-0 ${
                    selectedOption === 'mock' 
                      ? 'border-[#3B82F6] shadow-[0_0_0_3px_rgba(59,130,246,0.08)]' 
                      : 'border-[#E8ECF1] hover:border-[#3B82F6] hover:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                  }`}
                >
                  <div className="flex shrink-0 lg:justify-center lg:mb-3 lg:w-full">
                    <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-[10px] flex items-center justify-center transition-colors bg-[#EFF6FF]">
                      <Clock className="w-5 h-5 transition-colors text-[#3B82F6]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 lg:w-full">
                    <div className="flex items-center gap-2 mb-1 lg:mb-1 lg:justify-center">
                      <span className={`text-[15px] lg:text-[16px] font-bold transition-colors ${selectedOption === 'mock' ? 'text-[#1a1f36]' : 'text-[#374151] group-hover:text-[#1a1f36]'}`}>Mock Exam</span>
                      <span className="relative flex items-center">
                        <Info 
                          onMouseEnter={() => setActiveTooltip('mock')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-[14px] h-[14px] cursor-help transition-colors ${selectedOption === 'mock' ? 'text-[#3B82F6]' : 'text-[#9CA3AF] group-hover:text-[#3B82F6]'}`} 
                        />
                        {activeTooltip === 'mock' && <Tooltip text={tooltips.mock.text} />}
                      </span>
                    </div>
                    <p className="text-[12px] lg:text-[13px] text-[#9CA3AF] leading-snug lg:leading-relaxed max-w-[320px] m-0 lg:mx-auto">
                      <span className="lg:hidden">Timed IELTS-style practice</span>
                      <span className="hidden lg:inline">Practice in a real IELTS computer-based environment with timer</span>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => selectedOption && setCardView(selectedOption)} 
                  disabled={!selectedOption}
                  className={`hidden lg:block w-full h-[50px] rounded-[10px] font-bold text-[16px] mt-2 transition-all shadow-md active:scale-[0.98] ${
                    selectedOption ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46]' : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  Start free evaluation
                </button>
              </div>
            ) : cardView === 'mock' ? (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
                  </button>
                  <h3 className="text-[18px] font-bold text-[#1a1f36]">Mock Exam</h3>
                </div>

                <div className="space-y-5 flex-1">
                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Exam Type</label>
                    <div className="relative">
                      <select 
                        value={essayData.examType}
                        onChange={(e) => updateEssayData({ examType: e.target.value })}
                        className="w-full h-[46px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#1a1f36] appearance-none focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select</option>
                        <option value="Academic">Academic</option>
                        <option value="General">General</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Task Type</label>
                    <div className="relative">
                      <select 
                        value={essayData.taskType}
                        onChange={(e) => updateEssayData({ taskType: e.target.value })}
                        className="w-full h-[46px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#1a1f36] appearance-none focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select</option>
                        <option value="Task 1">Task 1</option>
                        <option value="Task 2">Task 2</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/login', { state: { from: { pathname: '/mock-exam' } } });
                      return;
                    }
                    if ((user.credits_remaining ?? 0) <= 0) {
                      navigate('/analysis-ready', { state: { outOfCredits: true } });
                      return;
                    }
                    navigate('/mock-exam');
                  }}
                  disabled={!essayData.examType || !essayData.taskType}
                  className={`w-full h-[50px] rounded-[8px] font-bold text-[15px] mt-8 transition-all ${
                    (essayData.examType && essayData.taskType)
                      ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46] shadow-lg' 
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  Start Mock Exam
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
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
                      updateEssayData({
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
                      });

                      if (!user) {
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
            <span>1 free full report — no credit card</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] whitespace-nowrap">
            <Zap className="w-[17px] h-[17px] text-[#3B82F6] shrink-0" strokeWidth={2} />
            <span>Criterion scores + fixes — not just a band</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] whitespace-nowrap">
            <ShieldCheck className="w-[17px] h-[17px] text-[#3B82F6] shrink-0" strokeWidth={2} />
            <span>Personalized steps to your target band</span>
          </div>
        </div>

        {/* Desktop left copy (hidden on mobile) */}
        <div className="hidden lg:block w-full order-3 lg:order-1 lg:w-[55%] animate-fadeIn">
          <div className="inline-flex items-center px-4 py-1.5 bg-[#FEF9C3] border border-[#FDE68A] rounded-full text-[13px] font-medium text-[#78350F] mb-6">
            1 free evaluation · No card required
          </div>

          <h1 className="text-[44px] font-bold text-[#1a1f36] leading-[1.05] tracking-[-0.03em] mb-8 font-['Nunito',_sans-serif]">
            Your IELTS Writing Tutor.<br />
            Band scores, fixes & a plan in<br />
            <span className="text-[#3B82F6]">60 Seconds.</span>
          </h1>

          <p className="text-[17px] text-[#6B7280] leading-[1.6] mb-10 max-w-[540px]">
            Stop guessing. Sign up free, upload an essay (or take a mock), and get criterion scores, sentence-level corrections, and a clear improvement plan — 1 full evaluation included.
          </p>

          <div className="space-y-5 mb-10">
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <Star className="w-5 h-5 text-[#F59E0B] shrink-0" fill="#F59E0B" strokeWidth={2} />
              1 free full report — no credit card
            </div>
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <Zap className="w-5 h-5 text-[#2DD4BF] shrink-0" strokeWidth={2} />
              Criterion scores + sentence fixes — not just a band
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
