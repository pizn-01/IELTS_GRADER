import React from 'react';
import { FileText, Loader2 } from 'lucide-react';

const CRITERIA = [
  { key: 'response', label: 'TR', full: 'Task Response', color: '#2563EB' },
  { key: 'coherence', label: 'CC', full: 'Coherence', color: '#7C3AED' },
  { key: 'vocabulary', label: 'LR', full: 'Lexical', color: '#059669' },
  { key: 'grammar', label: 'GRA', full: 'Grammar', color: '#DC2626' },
];

const CHAPTER_PREVIEW = [
  { short: 'TR', color: '#2563EB', title: 'Task Response' },
  { short: 'CC', color: '#7C3AED', title: 'Coherence' },
  { short: 'LR', color: '#059669', title: 'Lexical' },
  { short: 'GRA', color: '#DC2626', title: 'Grammar' },
];

function bandColor(score) {
  if (score >= 7) return '#00C9B1';
  if (score >= 5.5) return '#F59E0B';
  return '#EF4444';
}

function OverallGauge({ score }) {
  const pct = score != null ? Math.min(score / 9, 1) : 0;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative w-[88px] h-[88px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="42" fill="none" stroke="#EEF2F6" strokeWidth="7" />
        <circle
          cx="48"
          cy="48"
          r="42"
          fill="none"
          stroke={score != null ? bandColor(score) : '#CBD5E1'}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-bold text-[#101828] leading-none">
          {score != null ? score.toFixed(1) : '—'}
        </span>
        <span className="text-[9px] text-gray-400 font-semibold mt-0.5">Overall</span>
      </div>
    </div>
  );
}

function CriteriaBars({ avgBands }) {
  const rows = CRITERIA.filter((c) => avgBands?.[c.key] != null);
  if (!rows.length) return null;

  return (
    <div className="flex-1 space-y-2 min-w-0">
      {rows.map(({ key, label, color }) => {
        const val = avgBands[key];
        const pct = Math.min((val / 9) * 100, 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 w-7 shrink-0">{label}</span>
            <div className="flex-1 h-[7px] bg-[#EEF2F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#101828] w-6 text-right shrink-0">
              {val.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ErrorFocusChart({ topErrors, errorsByCriteria }) {
  const items = (topErrors || []).slice(0, 5);
  const maxCount = items.reduce((m, e) => Math.max(m, e.count || 0), 1);

  if (!items.length && errorsByCriteria) {
    const critItems = Object.entries(errorsByCriteria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([crit, count]) => ({
        label: crit.replace('Grammatical Range and Accuracy', 'Grammar').replace('Coherence and Cohesion', 'Coherence'),
        count,
      }));
    const max = critItems.reduce((m, e) => Math.max(m, e.count), 1);
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Errors by area</p>
        {critItems.map((e) => (
          <div key={e.label} className="flex items-center gap-2">
            <span className="text-[11px] text-[#667085] w-[72px] shrink-0 truncate">{e.label}</span>
            <div className="flex-1 h-[6px] bg-[#EEF2F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1A96F3]"
                style={{ width: `${(e.count / max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 w-5 text-right">{e.count}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Most frequent mistakes</p>
      {items.map((e) => (
        <div key={e.label} className="flex items-center gap-2">
          <span className="text-[11px] text-[#667085] flex-1 min-w-0 truncate" title={e.label}>
            {e.label}
          </span>
          <div className="w-[72px] h-[6px] bg-[#EEF2F6] rounded-full overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1A96F3] to-[#38BDF8]"
              style={{ width: `${((e.count || 1) / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-gray-400 w-5 text-right shrink-0">×{e.count}</span>
        </div>
      ))}
    </div>
  );
}

function PdfPreviewMock({ status, examRange }) {
  const isReady = status === 'ready';
  const isGenerating = status === 'generating' || status === 'pending_payment';

  return (
    <div className="relative rounded-xl border border-[#E5E7EB] bg-gradient-to-b from-white to-[#F8FAFC] p-4 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A96F3] via-[#7C3AED] to-[#059669]" />
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] flex items-center justify-center text-[#1A96F3]">
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#101828] truncate">
            {isReady ? 'Your guide is ready' : isGenerating ? 'Building your guide…' : 'Guide preview'}
          </p>
          <p className="text-[10px] text-gray-400">Exams {examRange?.start}–{examRange?.end}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {CHAPTER_PREVIEW.map((ch, i) => (
          <div
            key={ch.short}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ backgroundColor: `${ch.color}08` }}
          >
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
              style={{ backgroundColor: ch.color }}
            >
              {ch.short}
            </span>
            <div className="flex-1 space-y-1">
              <div
                className="h-1 rounded-full"
                style={{
                  width: `${72 - i * 8}%`,
                  backgroundColor: `${ch.color}30`,
                }}
              />
              <div
                className="h-1 rounded-full"
                style={{
                  width: `${55 - i * 6}%`,
                  backgroundColor: `${ch.color}18`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {isGenerating && (
        <div className="mt-3 h-1 bg-[#EEF2F6] rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-[#1A96F3] rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

export default function LearningEditionSnapshot({ preview, status, examRange, locked }) {
  if (locked) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <PdfPreviewMock status="preview" examRange={examRange} />
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center">
          <p className="text-[12px] font-semibold text-[#344054]">Unlock after 5 graded exams</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Your personalized PDF will map band scores, recurring errors, and chapter-by-chapter fixes.
          </p>
        </div>
      </div>
    );
  }

  const avgBands = preview?.avgBands;
  const hasBands = avgBands?.overall != null;

  return (
    <div className="flex flex-col gap-4 h-full">
      {hasBands && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
            Edition band snapshot
          </p>
          <div className="flex items-center gap-4">
            <OverallGauge score={avgBands.overall} />
            <CriteriaBars avgBands={avgBands} />
          </div>
        </div>
      )}

      {(preview?.topErrors?.length > 0 || preview?.errorsByCriteria) && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <ErrorFocusChart
            topErrors={preview?.topErrors}
            errorsByCriteria={preview?.errorsByCriteria}
          />
        </div>
      )}

      <div className="flex-1 min-h-0">
        <PdfPreviewMock status={status} examRange={examRange} />
      </div>
    </div>
  );
}
