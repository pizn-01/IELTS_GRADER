import React, { useEffect, useMemo, useRef, useState } from 'react';
import QuestionChart, { detectChartType } from './QuestionChart';
import { isGeneralTask1Letter, parseLetterQuestion } from '../utils/parseLetterQuestion';
import { isAcademicTask1Report, parseReportQuestion } from '../utils/parseReportQuestion';

export function noteForTimeLimit(seconds, examType, taskType) {
  if (isGeneralTask1Letter(examType, taskType) || isAcademicTask1Report(examType, taskType)) {
    return 'You should spend about 20 minutes on this task.\n\nWrite at least 150 words.';
  }
  return seconds <= 1200
    ? 'Write at least 150 words. You have 20 minutes.'
    : 'Write at least 250 words. You have 40 minutes.';
}

function LetterQuestionDisplay({ text }) {
  const { scenario, bullets } = parseLetterQuestion(text);
  return (
    <>
      <p className="text-[14px] md:text-[15px] font-bold text-[#101828] leading-[1.6] mb-4">
        {scenario}
      </p>
      {bullets.length > 0 && (
        <div className="mb-2">
          <p className="text-[13px] md:text-[14px] font-bold text-[#101828] mb-3">In your letter:</p>
          <ul className="space-y-2.5">
            {bullets.map((bullet, index) => (
              <li key={index} className="flex gap-2.5 text-[13px] md:text-[14px] text-[#344054] leading-[1.65]">
                <span className="font-bold text-[#0EA5E9] shrink-0 w-5">{index + 1}.</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ReportQuestionDisplay({ text, chartType, chartSvg, chartImage }) {
  const { scenario, instruction } = parseReportQuestion(text);
  // Prefer svg/image; fall back to synthetic chart from chartType/seed.
  const showChart = Boolean(chartSvg || chartImage || chartType || text);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(null);

  useEffect(() => {
    if (!expanded) return undefined;
    const onPointerDown = (e) => {
      if (expandedRef.current && !expandedRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  const chartProps = {
    type: chartType,
    seed: text,
    svg: chartSvg,
    image: chartImage,
    fit: true,
  };

  return (
    <>
      {/* Keep timing + task rules visible; chart scales to fit (no internal scroll). */}
      <p className="text-[11px] md:text-[12px] text-[#475467] leading-[1.7] font-medium opacity-90 mb-2 md:mb-3">
        You should spend about 20 minutes on this task.
      </p>
      <h2 className="text-[14px] md:text-[15px] font-bold text-[#101828] leading-[1.6] mb-2 md:mb-3">
        {scenario}
      </h2>
      {showChart && (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          title="Click to enlarge chart"
          onClick={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(true);
            }
          }}
          className="mb-2 md:mb-4 w-full h-[min(200px,32vh)] md:h-[280px] lg:h-[320px] overflow-hidden rounded-[8px] cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/focus-visible:ring-offset-2"
        >
          <QuestionChart {...chartProps} />
        </div>
      )}
      {expanded && showChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:p-8">
          <div
            ref={expandedRef}
            className="w-[min(960px,92vw)] h-[min(640px,80vh)] rounded-[12px] overflow-hidden shadow-2xl"
          >
            <QuestionChart {...chartProps} />
          </div>
        </div>
      )}
      <p className="text-[12px] md:text-[13px] text-[#475467] leading-[1.6] font-medium mb-2">
        {instruction}
      </p>
      <p className="text-[11px] md:text-[12px] text-[#475467] leading-[1.7] font-medium opacity-90">
        Write at least 150 words.
      </p>
    </>
  );
}

function Task2QuestionDisplay({ text }) {
  const displayText = (text || '')
    .replace(/\n\nWrite at least 250 words\.?\s*$/i, '')
    .replace(/\n\nSummarise the information[\s\S]*$/i, '')
    .trim();
  return (
    <h2 className="text-[14px] md:text-[15px] font-bold text-[#101828] leading-[1.6] mb-5">
      {displayText}
    </h2>
  );
}

/**
 * Renders the mock-exam question panel (left column) for any task type.
 */
export default function ExamQuestionPanel({
  examType,
  taskType,
  questionText,
  chartSvg = null,
  chartImage = null,
  chartType = null,
  timeLimitSeconds = null,
  timeNote = null,
  showBadge = true,
  className = '',
}) {
  const isLetter = isGeneralTask1Letter(examType, taskType);
  const isReport = isAcademicTask1Report(examType, taskType);
  const resolvedNote = timeNote ?? noteForTimeLimit(timeLimitSeconds ?? (isLetter || isReport ? 1200 : 2400), examType, taskType);

  const resolvedChartType = useMemo(() => {
    if (!isReport) return null;
    return chartType || detectChartType(questionText);
  }, [isReport, chartType, questionText]);

  return (
    <div className={className}>
      {showBadge && (
        <div className="mb-4 md:mb-6">
          <span className="bg-[#E0F2FE] text-[#0EA5E9] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {examType} {taskType || 'Task 2'}
          </span>
        </div>
      )}
      {isLetter ? (
        <LetterQuestionDisplay text={questionText} />
      ) : isReport ? (
        <ReportQuestionDisplay
          text={questionText}
          chartType={resolvedChartType}
          chartSvg={chartSvg}
          chartImage={chartImage}
        />
      ) : (
        <Task2QuestionDisplay text={questionText} />
      )}
      {/* Report tasks render spend/word instructions inline above; avoid duplicating below. */}
      {!isReport && (
        <div className="space-y-4 text-[11px] md:text-[12px] text-[#475467] leading-[1.7] font-medium opacity-90 mt-5">
          <p className="whitespace-pre-line">{resolvedNote}</p>
        </div>
      )}
    </div>
  );
}
