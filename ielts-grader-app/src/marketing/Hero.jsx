import React, { useState, useEffect, useCallback } from 'react';
import { FileCheck2, Clock, Info, Star, Zap, ShieldCheck, ChevronLeft, ChevronRight, Target, PenLine } from 'lucide-react';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GradeEssayForm from '../components/GradeEssayForm';

const MOCK_OPTIONS = [
  { examType: 'Academic', taskType: 'Task 1', label: 'Task 1', sublabel: 'Report' },
  { examType: 'Academic', taskType: 'Task 2', label: 'Task 2', sublabel: 'Essay' },
  { examType: 'General', taskType: 'Task 1', label: 'Task 1', sublabel: 'Letter' },
  { examType: 'General', taskType: 'Task 2', label: 'Task 2', sublabel: 'Essay' },
];

const SLIDE_INTERVAL_MS = 4000;

const HERO_SLIDES = [
  {
    id: 'speed',
    cue: 'both',
    badge: '1 free evaluation · No card required',
    mobileBadge: 'Free · No card',
    lines: ['Band scores, fixes & a plan in', '60 Seconds.'],
    accentWord: '60 Seconds.',
    support:
      'Stop guessing. Sign up free, upload an essay (or take a mock), and get criterion scores, sentence-level corrections, and a clear improvement plan: 1 full evaluation included.',
    chip: { Icon: Star, text: '1 free full report, no credit card', iconClass: 'text-[#F59E0B]', fill: '#F59E0B' },
    accent: '#3B82F6',
    mobileSub: (
      <>
        Band scores in <span className="text-[#3B82F6]">60 seconds.</span>
      </>
    ),
  },
  {
    id: 'fixes',
    cue: 'grade',
    badge: 'Sentence-level tutor report',
    mobileBadge: 'Sentence-level fixes',
    lines: ['Stop chasing a number.', 'See the exact sentences', 'costing you band points.'],
    accentWord: 'band points.',
    support:
      'Criterion scores plus rewrite cards for Task 1 & 2 — so you know what to change, not just what you scored.',
    chip: { Icon: PenLine, text: 'Criterion scores + sentence fixes, not just a band', iconClass: 'text-[#F59E0B]', fill: null },
    accent: '#F59E0B',
    mobileSub: (
      <>
        See the sentences <span className="text-[#3B82F6]">costing you band points.</span>
      </>
    ),
  },
  {
    id: 'mock',
    cue: 'mock',
    badge: 'Exam-day simulation',
    mobileBadge: 'Timed mock exam',
    lines: ['Practice like it’s test day.', 'Timed mock. Real conditions.', 'Instant tutor report.'],
    accentWord: 'Instant tutor report.',
    support:
      'Sit a computer-based IELTS mock with a real timer, then get the same criterion scores and fixes as a live evaluation.',
    chip: { Icon: Clock, text: 'Timed mock under real exam conditions', iconClass: 'text-[#0D9488]', fill: null },
    accent: '#0D9488',
    mobileSub: (
      <>
        Timed mock. Real conditions. <span className="text-[#3B82F6]">Instant report.</span>
      </>
    ),
  },
  {
    id: 'plan',
    cue: 'both',
    badge: 'Personalized next steps',
    mobileBadge: 'Your band plan',
    lines: ['Know your next move.', 'A clear plan to climb', 'toward Band 7+.'],
    accentWord: 'Band 7+.',
    support:
      'Weakest criteria ranked, prioritized fixes, and what to practice next — a clear path toward your target band.',
    chip: { Icon: Target, text: 'Personalized next steps toward your target band', iconClass: 'text-[#6366F1]', fill: null },
    accent: '#6366F1',
    mobileSub: (
      <>
        A clear plan to climb toward <span className="text-[#3B82F6]">Band 7+.</span>
      </>
    ),
  },
];

const Hero = () => {
  const navigate = useNavigate();
  const { updateEssayData } = useGrade();
  const { user } = useAuth();
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [cardView, setCardView] = useState('default'); // 'default', 'mock', 'upload'
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const slide = HERO_SLIDES[slideIndex];
  const cueGrade = slide.cue === 'grade';
  const cueMock = slide.cue === 'mock';

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || cardView !== 'default') return undefined;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, cardView]);

  const goToSlide = useCallback((i) => {
    setSlideIndex(i);
  }, []);

  const onSpotlightEnter = () => setPaused(true);
  const onSpotlightLeave = (e) => {
    if (e?.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    setPaused(false);
  };

  const tooltips = {
    essay: { text: 'Paste or upload your IELTS essay (and optional question prompt) to get criterion scores and fixes.' },
    mock: { text: 'Practice under exam conditions to simulate a real computer-based IELTS environment.' },
  };

  const Tooltip = ({ text }) => (
    <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[240px] bg-[#1a1f36] rounded-lg p-4 shadow-2xl z-50 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      <p className="m-0 text-[13px] leading-relaxed font-normal text-white opacity-95">{text}</p>
      <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 rotate-45 w-[10px] h-[10px] bg-[#1a1f36]"></div>
    </div>
  );

  const handleStartMock = (examType, taskType) => {
    if (user && (user.credits_remaining ?? 0) <= 0) {
      navigate('/analysis-ready', { state: { outOfCredits: true } });
      return;
    }
    updateEssayData({ examType, taskType });
    navigate('/mock-exam');
  };

  const isMockMobileFill = cardView === 'mock';
  const ChipIcon = slide.chip.Icon;

  const renderHeadlineLines = (lines, accentWord, className) => (
    <div className={className} aria-live="polite">
      {lines.map((line) => (
        <span key={line} className="block">
          {line === accentWord ? <span className="text-[#3B82F6]">{line}</span> : line}
        </span>
      ))}
    </div>
  );

  return (
    <header
      id="about"
      className="hero-mobile-wash relative box-border overflow-hidden flex flex-col pt-6 pb-3 lg:py-12 lg:items-center lg:justify-center min-h-[calc(100dvh-64px)] lg:min-h-[700px]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[80px] w-full flex-1 flex flex-col lg:flex-none lg:flex-row lg:items-center gap-0 lg:gap-8">

        {/* Mobile: compact rotating headline above the card */}
        {cardView !== 'mock' && (
          <div
            className="w-full order-1 lg:hidden animate-fadeInUp text-center shrink-0 mb-5"
            onMouseEnter={onSpotlightEnter}
            onMouseLeave={onSpotlightLeave}
            onFocus={onSpotlightEnter}
            onBlur={onSpotlightLeave}
          >
            <div
              key={`m-badge-${slide.id}`}
              className="inline-flex items-center px-2.5 py-0.5 bg-[#FFFBEB]/80 border border-[#FDE68A]/70 rounded-full text-[11px] font-medium text-[#92400E]/90 mb-3 tracking-wide hero-slide-enter"
            >
              {slide.mobileBadge}
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#1a1f36] leading-[1.2] tracking-[-0.03em] m-0 font-['Nunito',_sans-serif]">
              Your IELTS Writing Tutor.
            </h1>
            <p
              key={`m-sub-${slide.id}`}
              className="mt-1.5 mb-0 text-[15px] sm:text-[17px] font-semibold text-[#374151] leading-snug hero-slide-enter"
              aria-live="polite"
            >
              {slide.mobileSub}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-3" role="tablist" aria-label="Marketing messages">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === slideIndex}
                  aria-label={`Message ${i + 1}`}
                  onClick={() => goToSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === slideIndex ? 'w-5 bg-[#3B82F6]' : 'w-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submission card — first interactive surface on mobile */}
        <div
          className={`w-full order-2 lg:order-2 lg:w-[42%] flex flex-col items-center lg:items-stretch animate-fadeInUp animate-delay-50 mb-2.5 lg:mb-0 ${
            isMockMobileFill ? 'flex-1 min-h-0 lg:flex-none lg:shrink-0' : 'shrink-0'
          }`}
          onMouseEnter={onSpotlightEnter}
          onMouseLeave={onSpotlightLeave}
          onFocus={onSpotlightEnter}
          onBlur={onSpotlightLeave}
        >
          <div className={`bg-white/95 rounded-[16px] border border-[#E8ECF1] shadow-[0_12px_40px_rgba(26,31,54,0.06)] w-full max-w-[462px] lg:max-w-none flex flex-col transition-all duration-500 ${
            cardView === 'mock' ? 'p-4 lg:p-6 flex-1 lg:flex-auto min-h-0 lg:h-full' : 'p-4 pb-5 lg:p-5'
          }`}>

            {cardView === 'default' ? (
              <div className="flex flex-col animate-fadeIn">
                <h3 className="text-[16px] lg:text-[18px] font-bold text-[#1a1f36] mb-3 tracking-[-0.01em] shrink-0">Start your free tutor report</h3>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCardView('upload')}
                    className={`group relative flex items-center gap-3.5 text-left rounded-[12px] border bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] p-5 min-h-[136px] cursor-pointer transition-all active:scale-[0.98] hover:border-[#3B82F6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)] ${
                      cueGrade
                        ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/35 shadow-[0_8px_24px_rgba(59,130,246,0.18)] hero-cta-pulse'
                        : 'border-[#BFDBFE]'
                    }`}
                  >
                    <div className="flex shrink-0">
                      <div className="w-12 h-12 rounded-[12px] flex items-center justify-center bg-white shadow-sm border border-[#BFDBFE]/60">
                        <FileCheck2 className="w-6 h-6 text-[#3B82F6]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pr-5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] lg:text-[15px] font-bold text-[#1a1f36]">Grade my essay</span>
                        <span className="relative flex items-center">
                          <Info
                            onMouseEnter={() => setActiveTooltip('upload')}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[13px] h-[13px] cursor-help text-[#9CA3AF] group-hover:text-[#3B82F6] transition-colors"
                          />
                          {activeTooltip === 'upload' && <Tooltip text={tooltips.essay.text} />}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6B7280] leading-snug m-0">
                        Paste or upload your essay for a band score and fixes
                      </p>
                    </div>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3B82F6]/70 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardView('mock')}
                    className={`group relative flex items-center gap-3.5 text-left rounded-[12px] border bg-gradient-to-r from-[#F0FDFA] to-[#F8FAFC] p-5 min-h-[136px] cursor-pointer transition-all active:scale-[0.98] hover:border-[#2DD4BF] hover:shadow-[0_8px_24px_rgba(45,212,191,0.12)] ${
                      cueMock
                        ? 'border-[#2DD4BF] ring-2 ring-[#2DD4BF]/40 shadow-[0_8px_24px_rgba(45,212,191,0.18)] hero-cta-pulse'
                        : 'border-[#99F6E4]'
                    }`}
                  >
                    <div className="flex shrink-0">
                      <div className="w-12 h-12 rounded-[12px] flex items-center justify-center bg-white shadow-sm border border-[#99F6E4]/60">
                        <Clock className="w-6 h-6 text-[#0D9488]" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pr-5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] lg:text-[15px] font-bold text-[#1a1f36]">Mock Exam</span>
                        <span className="relative flex items-center">
                          <Info
                            onMouseEnter={() => setActiveTooltip('mock')}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[13px] h-[13px] cursor-help text-[#9CA3AF] group-hover:text-[#0D9488] transition-colors"
                          />
                          {activeTooltip === 'mock' && <Tooltip text={tooltips.mock.text} />}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6B7280] leading-snug m-0">
                        Practice in a real IELTS computer-based environment with timer
                      </p>
                    </div>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0D9488]/70 shrink-0" />
                  </button>
                </div>

                <p className="hidden lg:block text-center text-[12px] text-[#9CA3AF] mt-3.5 mb-0 shrink-0">
                  1 free evaluation · No credit card · Results in about 60 seconds
                </p>
              </div>
            ) : cardView === 'mock' ? (
              <div className="flex-1 flex flex-col animate-fadeIn min-h-0">
                <div className="flex items-center gap-2.5 mb-3 lg:mb-6 shrink-0">
                  <button type="button" onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors shrink-0">
                    <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-[16px] lg:text-[18px] font-bold text-[#1a1f36] leading-tight">Mock Exam</h3>
                    <p className="text-[11px] lg:text-[12px] text-[#6B7280] m-0 mt-0.5">Pick a task to start</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5 lg:gap-4 flex-1 min-h-0">
                  {MOCK_OPTIONS.map((opt) => {
                    const isAcademic = opt.examType === 'Academic';
                    return (
                      <button
                        key={`${opt.examType}-${opt.taskType}`}
                        type="button"
                        onClick={() => handleStartMock(opt.examType, opt.taskType)}
                        className={`group text-left rounded-[12px] border p-3.5 lg:p-5 h-full min-h-0 cursor-pointer transition-all active:scale-[0.98] hover:shadow-md flex flex-col justify-center ${
                          isAcademic
                            ? 'border-[#BFDBFE] bg-gradient-to-b from-[#EFF6FF] to-white hover:border-[#3B82F6]'
                            : 'border-[#99F6E4] bg-gradient-to-b from-[#F0FDFA] to-white hover:border-[#2DD4BF]'
                        }`}
                      >
                        <p className={`text-[10px] lg:text-[11px] font-bold uppercase tracking-wide mb-1 ${isAcademic ? 'text-[#3B82F6]' : 'text-[#0D9488]'}`}>
                          {opt.examType}
                        </p>
                        <p className="text-[14px] lg:text-[15px] font-bold text-[#1a1f36] mb-0 leading-tight">
                          {opt.label}
                        </p>
                        <p className="text-[12px] text-[#6B7280] m-0 mt-0.5">{opt.sublabel}</p>
                        <ChevronRight className={`hidden lg:block w-4 h-4 mt-3 transition-transform group-hover:translate-x-0.5 ${isAcademic ? 'text-[#3B82F6]' : 'text-[#0D9488]'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <GradeEssayForm
                variant="card"
                onBack={() => setCardView('default')}
                showMaximize
                onMaximize={(draft) => navigate('/grade-my-essay', { state: draft })}
              />
            )}
          </div>
        </div>

        {/* Mobile: composed rating + benefits fill remaining viewport (hidden on mock) */}
        {cardView !== 'mock' && (
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
            <div
              key={`m-chip-${slide.id}`}
              className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] hero-slide-enter"
            >
              <ChipIcon
                className={`w-[17px] h-[17px] shrink-0 ${slide.chip.iconClass}`}
                strokeWidth={2}
                {...(slide.chip.fill ? { fill: slide.chip.fill } : {})}
              />
              <span>{slide.chip.text}</span>
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
        )}

        {/* Desktop left spotlight (hidden on mobile) */}
        <div
          className="hidden lg:flex w-full order-3 lg:order-1 lg:w-[54%] animate-fadeIn flex-col justify-center"
          onMouseEnter={onSpotlightEnter}
          onMouseLeave={onSpotlightLeave}
          onFocus={onSpotlightEnter}
          onBlur={onSpotlightLeave}
        >
          <div className="flex items-stretch">
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="min-h-[320px] flex flex-col">
                <div
                  key={`badge-${slide.id}`}
                  className="inline-flex items-center self-start px-4 py-1.5 bg-[#FEF9C3] border border-[#FDE68A] rounded-full text-[13px] font-medium text-[#78350F] mb-4 hero-slide-enter"
                >
                  {slide.badge}
                </div>

                <h1 className="text-[40px] xl:text-[44px] font-bold text-[#1a1f36] leading-[1.05] tracking-[-0.03em] m-0 font-['Nunito',_sans-serif]">
                  Your IELTS Writing Tutor.
                </h1>

                <div key={`lines-${slide.id}`} className="hero-slide-enter mt-1 mb-5">
                  {renderHeadlineLines(
                    slide.lines,
                    slide.accentWord,
                    "text-[40px] xl:text-[44px] font-bold text-[#1a1f36] leading-[1.05] tracking-[-0.03em] font-['Nunito',_sans-serif]"
                  )}
                </div>

                <p
                  key={`support-${slide.id}`}
                  className="text-[16px] text-[#6B7280] leading-[1.55] mb-6 max-w-[480px] hero-slide-enter m-0"
                >
                  {slide.support}
                </p>

                <div
                  key={`chip-${slide.id}`}
                  className="inline-flex items-center gap-3 self-start px-4 py-2.5 rounded-[12px] bg-white/80 border border-[#E8ECF1] shadow-[0_4px_16px_rgba(26,31,54,0.04)] mb-6 hero-slide-enter"
                >
                  <ChipIcon
                    className={`w-5 h-5 shrink-0 ${slide.chip.iconClass}`}
                    strokeWidth={2}
                    {...(slide.chip.fill ? { fill: slide.chip.fill } : {})}
                  />
                  <span className="text-[15px] font-medium text-[#1a1f36]">{slide.chip.text}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Marketing messages">
                  {HERO_SLIDES.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={i === slideIndex}
                      aria-label={`Message ${i + 1}: ${s.badge}`}
                      onClick={() => goToSlide(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === slideIndex ? 'w-6' : 'w-2 bg-[#D1D5DB] hover:bg-[#9CA3AF]'
                      }`}
                      style={i === slideIndex ? { backgroundColor: slide.accent } : undefined}
                    />
                  ))}
                </div>
                <span className="text-[13px] text-[#9CA3AF] flex items-center gap-1">
                  Start free on the right
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {['photo-1534528741775-53994a69daeb', 'photo-1506794778202-cad84cf45f1d', 'photo-1494790108377-be9c29b29330', 'photo-1500648767791-00dcc994a43e'].map((id, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                      <img src={`https://images.unsplash.com/${id}?w=100&h=100&fit=crop`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 text-[#F59E0B]" fill="#F59E0B" />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-bold text-[#1a1f36]">4.9/5</span>
                    <span className="text-[14px] text-[#9CA3AF]">from 2,400+ reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
