import React, { useState, useEffect, useCallback } from 'react';
import { FileCheck2, Clock, Info, Star, ChevronLeft, ChevronRight, Gift, BarChart3, Target } from 'lucide-react';
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

const AVATARS = [
  '/images/avatars/avatar-1.jpg',
  '/images/avatars/avatar-2.jpg',
  '/images/avatars/avatar-3.jpg',
  '/images/avatars/avatar-4.jpg',
];

const BENEFIT_BULLETS = [
  { Icon: FileCheck2, title: 'Detailed report', detail: 'Criterion scores + scoring breakdown' },
  { Icon: BarChart3, title: 'Overall performance', detail: 'Trends across your exams toward your goal' },
  { Icon: Target, title: 'Personalized learning', detail: 'What to practice first—ranked for you' },
];

const SLIDE_INTERVAL_MS = 5500;

const HERO_SLIDES = [
  {
    id: 'free',
    type: 'text',
    cue: 'both',
    badge: '1 free evaluation · No card required',
    mobileBadge: 'Free · No card',
    chip: { Icon: Gift, text: '1 free full evaluation · No credit card', iconClass: 'text-[#F59E0B]', fill: null },
    accent: '#0EA5E9',
    mobileSub: (
      <>
        Report, performance & plan — <span className="text-[#0EA5E9]">free, no card</span>
      </>
    ),
  },
  {
    id: 'report',
    type: 'shot',
    cue: 'grade',
    badge: 'Detailed report',
    mobileBadge: 'Detailed report',
    caption: 'Overall band, criterion scores, and a clear scoring breakdown—not just a number.',
    image: '/images/hero/report.png',
    imageAlt: 'Detailed IELTS report with criteria breakdown and scoring details',
    accent: '#0D9488',
    mobileSub: (
      <>
        Criterion scores & <span className="text-[#0EA5E9]">scoring details</span>
      </>
    ),
  },
  {
    id: 'performance',
    type: 'shot',
    cue: 'both',
    badge: 'Overall performance',
    mobileBadge: 'Performance',
    caption: 'Latest band, goal progress, strengths, and your top priority fixes in one view.',
    image: '/images/hero/performance.png',
    imageAlt: 'Overall performance dashboard with band goal and skill growth',
    accent: '#0284C7',
    mobileSub: (
      <>
        Track progress toward <span className="text-[#0EA5E9]">your target band</span>
      </>
    ),
  },
  {
    id: 'personalized',
    type: 'shot',
    cue: 'grade',
    badge: 'Personalized learning',
    mobileBadge: 'Your plan',
    caption: 'Your priority focus areas across exams—so you know exactly what to practice next.',
    image: '/images/hero/personalized.png',
    imageAlt: 'Personalized learning priorities and average bands for this edition',
    accent: '#0EA5E9',
    mobileSub: (
      <>
        Next steps tailored to <span className="text-[#0EA5E9]">your essays</span>
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
  const isTextSlide = slide.type === 'text';

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
  const ChipIcon = isTextSlide ? slide.chip.Icon : null;

  const BenefitBullets = ({ compact = false }) => (
    <ul
      className={`list-none m-0 p-0 flex flex-col ${compact ? 'gap-2.5' : 'gap-3.5'} max-w-[520px]`}
      aria-label="What you get"
    >
      {BENEFIT_BULLETS.map(({ Icon, title, detail }) => (
        <li key={title} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0284C7] ${
              compact ? 'w-7 h-7' : 'w-9 h-9'
            }`}
          >
            <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={2.25} />
          </span>
          <span className="min-w-0">
            <span className={`block font-semibold text-[#0f172a] leading-snug ${compact ? 'text-[13px]' : 'text-[16px]'}`}>
              {title}
            </span>
            <span className={`block text-[#64748B] leading-snug ${compact ? 'text-[12px] mt-0.5' : 'text-[14px] mt-0.5'}`}>
              {detail}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );

  const SlideDots = ({ className = '', size = 'sm' }) => (
    <div className={`flex items-center gap-1.5 ${className}`} role="tablist" aria-label="Product highlights">
      {HERO_SLIDES.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={i === slideIndex}
          aria-label={`${s.badge}`}
          onClick={() => goToSlide(i)}
          className={`rounded-full transition-all duration-300 ${
            size === 'sm' ? 'h-1.5' : 'h-2'
          } ${
            i === slideIndex
              ? size === 'sm'
                ? 'w-5 bg-[#0EA5E9]'
                : 'w-6'
              : size === 'sm'
                ? 'w-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]'
                : 'w-2 bg-[#D1D5DB] hover:bg-[#9CA3AF]'
          }`}
          style={i === slideIndex && size !== 'sm' ? { backgroundColor: slide.accent } : undefined}
        />
      ))}
    </div>
  );

  return (
    <header
      id="about"
      className="hero-mobile-wash relative box-border overflow-hidden flex flex-col pt-6 pb-3 lg:py-12 lg:items-center lg:justify-center min-h-[calc(100dvh-64px)] lg:min-h-[700px]"
    >
      <div className="hero-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[80px] w-full flex-1 flex flex-col lg:flex-none lg:flex-row lg:items-center gap-0 lg:gap-8 relative z-[1]">

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
              className={`inline-flex items-center px-2.5 py-0.5 border rounded-full text-[11px] font-medium mb-3 tracking-wide hero-slide-panel ${
                isTextSlide
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hero-free-badge'
                  : 'bg-white/90 border-[#BFDBFE] text-[#0369A1]'
              }`}
            >
              {slide.mobileBadge}
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#0f172a] leading-[1.2] tracking-[-0.03em] m-0 font-['Nunito',_sans-serif]">
              Your IELTS Writing Tutor.
            </h1>
            <p
              key={`m-sub-${slide.id}`}
              className="mt-2 mb-0 text-[14px] sm:text-[16px] font-medium text-[#64748B] leading-snug hero-slide-panel"
              aria-live="polite"
            >
              {slide.mobileSub}
            </p>
            <SlideDots className="justify-center mt-3" size="sm" />
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
                <h3 className="text-[16px] lg:text-[18px] font-bold text-[#1a1f36] mb-3 tracking-[-0.01em] shrink-0">
                  Start your <span className="text-[#0EA5E9]">free</span> tutor report
                </h3>

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
                  1 free evaluation · No credit card
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
              <span className="text-[12px] text-[#9CA3AF]">· Rated by IELTS learners</span>
            </div>
            {isTextSlide ? (
              <>
                <div
                  key={`m-chip-${slide.id}`}
                  className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-medium text-[#1a1f36] tracking-[-0.01em] hero-slide-panel mb-1"
                >
                  <ChipIcon
                    className={`w-[17px] h-[17px] shrink-0 ${slide.chip.iconClass}`}
                    strokeWidth={2}
                  />
                  <span>{slide.chip.text}</span>
                </div>
                <div key="m-bullets" className="hero-slide-panel">
                  <BenefitBullets compact />
                </div>
              </>
            ) : (
              <div key={`m-cap-${slide.id}`} className="hero-slide-panel">
                <p className="text-[13px] font-semibold text-[#0f172a] m-0 mb-1.5">{slide.badge}</p>
                <p className="text-[12px] sm:text-[13px] text-[#64748B] leading-snug m-0">{slide.caption}</p>
              </div>
            )}
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
              <div className={`flex flex-col ${isTextSlide ? 'min-h-[320px]' : 'min-h-[360px]'}`}>
                <div
                  key={`badge-${slide.id}`}
                  className={`inline-flex items-center self-start px-4 py-1.5 border rounded-full text-[13px] font-medium mb-4 hero-slide-panel ${
                    isTextSlide
                      ? 'bg-[#FEF9C3] border-[#FDE68A] text-[#78350F] hero-free-badge'
                      : 'bg-white/90 border-[#BAE6FD] text-[#0369A1] shadow-sm'
                  }`}
                >
                  {slide.badge}
                </div>

                <h1 className="text-[40px] xl:text-[44px] font-bold text-[#0f172a] leading-[1.05] tracking-[-0.03em] m-0 font-['Nunito',_sans-serif]">
                  Your IELTS Writing Tutor.
                </h1>

                {isTextSlide ? (
                  <>
                    <div key={`bullets-${slide.id}`} className="hero-slide-panel mt-5 mb-6">
                      <BenefitBullets />
                    </div>

                    <div
                      key={`chip-${slide.id}`}
                      className="inline-flex items-center gap-3 self-start px-4 py-2.5 rounded-[12px] bg-white/90 border border-[#FDE68A]/80 shadow-[0_4px_20px_rgba(245,158,11,0.08)] mb-6 hero-slide-panel"
                    >
                      <ChipIcon
                        className={`w-5 h-5 shrink-0 ${slide.chip.iconClass}`}
                        strokeWidth={2}
                      />
                      <span className="text-[15px] font-medium text-[#1a1f36]">{slide.chip.text}</span>
                    </div>
                  </>
                ) : (
                  <div key={`shot-${slide.id}`} className="hero-slide-panel mt-4 mb-5">
                    <p className="text-[15px] text-[#64748B] leading-snug m-0 mb-4 max-w-[480px]">
                      {slide.caption}
                    </p>
                    <div className="hero-shot-frame relative w-full max-w-[540px] overflow-hidden rounded-[14px] shadow-[0_16px_40px_rgba(15,23,42,0.1)]">
                      <img
                        src={slide.image}
                        alt={slide.imageAlt}
                        className="relative w-full h-auto max-h-[340px] object-contain object-center block bg-transparent"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-8">
                <SlideDots size="md" />
                <span className="text-[13px] text-[#94A3B8] flex items-center gap-1">
                  Start free on the right
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {AVATARS.map((src, i) => (
                    <div key={src} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                      <img src={src} alt="" className="w-full h-full object-cover" />
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
                    <span className="text-[14px] text-[#64748B]">Rated by IELTS learners</span>
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
