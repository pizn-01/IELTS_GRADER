import React from 'react';

export default function StrategyRoadmap({
  strongestCrit,
  bottleneckCrit,
  frequentErrors = [],
  examCount = 0,
}) {
  const top1 = frequentErrors[0]?.label;
  const top2 = frequentErrors[1]?.label;
  const checklistLine = top1 && top2
    ? `Check 6 minutes: Run your checklist (${top1}, ${top2}, referencing, articles).`
    : top1
    ? `Check 6 minutes: Run your checklist (${top1}, referencing, articles, repetition).`
    : 'Check 6 minutes: Run your checklist (top errors, referencing, articles, repetition).';

  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] overflow-hidden">
      <div className="px-6 md:px-8 py-5 border-b border-[#F2F4F7]">
        <h3 className="text-[18px] font-bold text-[#101828]">Strategic Roadmap</h3>
        <p className="text-[13px] text-[#667085] mt-1">
          {examCount > 0
            ? `Based on your ${examCount} graded exam${examCount === 1 ? '' : 's'} and Fix Cards. Updates when you return here after new practice.`
            : 'Complete graded practice to personalize this roadmap.'}
        </p>
      </div>
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#F0FDF9] border border-[#CCFBEF] rounded-[14px] p-5">
            <span className="text-[12px] font-bold text-[#047857] uppercase tracking-wider">Strongest area</span>
            <p className="text-[16px] font-semibold text-[#101828] mt-2">{strongestCrit.name}</p>
            {strongestCrit.avg != null && (
              <p className="text-[13px] text-[#667085] mt-1">Avg {strongestCrit.avg.toFixed(1)}. Keep stable while lifting weaker areas.</p>
            )}
          </div>
          <div className="bg-[#FFF1F3] border border-[#FECDD6] rounded-[14px] p-5">
            <span className="text-[12px] font-bold text-[#C01048] uppercase tracking-wider">Primary bottleneck</span>
            <p className="text-[16px] font-semibold text-[#101828] mt-2">{bottleneckCrit.name}</p>
            {bottleneckCrit.avg != null && (
              <p className="text-[13px] text-[#667085] mt-1">Avg {bottleneckCrit.avg.toFixed(1)}. Focus here for the fastest band gain.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[15px] font-bold text-[#101828]">Recommended workflow</h4>

          <div>
            <p className="text-[13px] font-bold text-[#344054] mb-3">Drafting phase</p>
            <ul className="space-y-3">
              {[
                'Plan 4 minutes: Position + 2 body ideas + examples.',
                'Write 30 minutes: Balanced paragraphs; 1 example per body paragraph minimum.',
                checklistLine,
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-[14px] text-[#344054] leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A96F3] mt-2 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-bold text-[#344054] mb-3">Rewrite recipe</p>
            <ul className="space-y-3">
              {[
                'Step 1: Fix task response (answer all parts; clear position).',
                'Step 2: Expand ideas (because + example).',
                'Step 3: Upgrade lexis (precise verbs/nouns; remove repetition).',
                'Step 4: Tighten cohesion (referencing; logical links).',
                'Step 5: Grammar sweep (SVA, articles, punctuation).',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-[14px] text-[#344054] leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#101828] mt-2 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-[#EFF8FF] border border-[#B2DDFF] rounded-[14px] p-5 md:p-6">
          <h4 className="text-[14px] font-bold text-[#101828] mb-4">Immediate action items</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-[14px] text-[#344054] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#175CD3] mt-2 shrink-0" />
              {frequentErrors.length > 0 ? (
                <>
                  Focus on your top {Math.min(2, frequentErrors.length)} Fix Card
                  {frequentErrors.length !== 1 ? 's' : ''} for 7 days
                  {top1 && <>: <strong className="text-[#101828]">{top1}</strong></>}
                  {top2 && <>, <strong className="text-[#101828]">{top2}</strong></>}.
                </>
              ) : (
                'Complete more exams to identify your top Fix Cards.'
              )}
            </li>
            <li className="flex items-start gap-3 text-[14px] text-[#344054] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#175CD3] mt-2 shrink-0" />
              In every body paragraph, add one mechanism sentence and one concrete example.
            </li>
            <li className="flex items-start gap-3 text-[14px] text-[#344054] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#175CD3] mt-2 shrink-0" />
              Use the 14-Day sprint tab for a day-by-day plan built from this roadmap.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
