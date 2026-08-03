import React from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Timer } from 'lucide-react';

const CRITERIA = [
  { label: 'Task Response', short: 'TR', value: 72 },
  { label: 'Coherence & Cohesion', short: 'CC', value: 85 },
  { label: 'Lexical Resource', short: 'LR', value: 78 },
  { label: 'Grammatical Range', short: 'GRA', value: 80 },
];

const StepSubmitVisual = () => (
  <div
    className="hiw-visual flex flex-col gap-2.5 w-full max-w-[280px] mx-auto"
    aria-hidden="true"
  >
    <div className="flex items-center gap-3 rounded-[12px] bg-white/90 border border-[#E0F2FE] px-3.5 py-3 shadow-sm">
      <span className="w-9 h-9 rounded-[10px] bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
        <FileUp size={18} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 text-left">
        <p className="m-0 text-[13px] font-bold text-[#1a1f36] leading-tight">Paste or upload</p>
        <p className="m-0 text-[11px] text-[#6B7280] leading-snug mt-0.5">PDF, Word, or photo</p>
      </div>
    </div>
    <div className="flex items-center gap-3 rounded-[12px] bg-white/90 border border-[#E2E8F0] px-3.5 py-3 shadow-sm">
      <span className="w-9 h-9 rounded-[10px] bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center shrink-0">
        <Timer size={18} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 text-left">
        <p className="m-0 text-[13px] font-bold text-[#1a1f36] leading-tight">Timed mock exam</p>
        <p className="m-0 text-[11px] text-[#6B7280] leading-snug mt-0.5">Exam-style conditions</p>
      </div>
    </div>
  </div>
);

const StepCriteriaVisual = () => (
  <div
    className="hiw-visual flex flex-col gap-2 w-full max-w-[280px] mx-auto"
    aria-hidden="true"
  >
    {CRITERIA.map((c) => (
      <div
        key={c.short}
        className="flex items-center gap-2.5 rounded-[10px] bg-white/90 border border-[#E2E8F0] px-3 py-2 shadow-sm"
      >
        <span className="text-[10px] font-bold tracking-wide text-[#0284C7] w-8 shrink-0">
          {c.short}
        </span>
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[11px] font-semibold text-[#374151] truncate leading-tight">
            {c.label}
          </p>
          <div className="mt-1 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3B82F6] hiw-bar"
              style={{ width: `${c.value}%` }}
            />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const STEPS = [
  {
    n: '1',
    title: 'Submit your writing',
    body: 'Paste or upload your question + answer (PDF, Word, or photo), or take a timed mock under exam conditions.',
    Visual: StepSubmitVisual,
    delayClass: 'animate-delay-100',
  },
  {
    n: '2',
    title: 'Dual-AI grades all 4 criteria',
    body: 'Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy, with criterion-based feedback aligned with public band descriptors (practice scores, not official).',
    Visual: StepCriteriaVisual,
    delayClass: 'animate-delay-200',
  },
  {
    n: '3',
    title: 'Get your tutor report',
    body: 'Band breakdown, fix cards, model answer, and what to practice next, with most reports in about 60 seconds.',
    Visual: null,
    delayClass: 'animate-delay-300',
  },
];

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="bg-white py-12 lg:py-20 overflow-hidden font-['Nunito',_sans-serif]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[100px]">
        <div className="text-center mb-10 lg:mb-14 mx-auto">
          <h2 className="text-[28px] lg:text-[32px] font-bold text-[#1a1f36] mb-3 tracking-tight leading-tight">
            How it works
          </h2>
          <p className="text-[14px] sm:text-[15px] lg:text-[16px] text-[#6B7280] leading-relaxed m-0 sm:whitespace-nowrap">
            From essay to a full tutor report in three steps, 2 free evaluations with signup, no card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-12 max-w-[1100px] mx-auto">
          {STEPS.map((step) => {
            const Visual = step.Visual;
            return (
              <div
                key={step.n}
                className={`hiw-step flex flex-col items-center text-center animate-fadeInUp ${step.delayClass}`}
              >
                <span className="w-9 h-9 bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 mb-4">
                  {step.n}
                </span>
                <h3 className="text-[18px] lg:text-[20px] font-bold text-[#1a1f36] mb-2 leading-snug m-0">
                  {step.title}
                </h3>
                <p className="text-[14px] lg:text-[15px] text-[#6B7280] leading-relaxed m-0 mb-6 max-w-[320px]">
                  {step.body}
                </p>
                <div className="w-full mt-auto flex justify-center min-h-[160px] items-center">
                  {Visual ? (
                    <Visual />
                  ) : (
                    <img
                      src="/images/hero/report.png"
                      alt="IELTS writing report with criterion band breakdown"
                      className="w-full max-w-[280px] h-auto drop-shadow-md rounded-[12px]"
                      width={560}
                      height={420}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 lg:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <Link
            to="/ielts-essay-checker"
            className="bg-[#1a1f36] text-white px-8 py-3.5 rounded-[12px] text-[16px] font-semibold no-underline hover:bg-[#2a2f46] transition-all shadow-md w-full sm:w-auto text-center"
          >
            Check your essay free
          </Link>
          <Link
            to="/ielts-mock-writing-test"
            className="text-[#101828] font-semibold no-underline text-[16px] hover:text-[#3B82F6] transition-all flex items-center gap-1"
          >
            Try a timed mock exam <span className="text-[#4B5563] ml-0.5">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
