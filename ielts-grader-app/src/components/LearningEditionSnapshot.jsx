import React from 'react';

const CRITERIA = [
  { key: 'response', label: 'TR', color: '#2563EB' },
  { key: 'coherence', label: 'CC', color: '#7C3AED' },
  { key: 'vocabulary', label: 'LR', color: '#059669' },
  { key: 'grammar', label: 'GRA', color: '#DC2626' },
];

function bandColor(score) {
  if (score >= 7) return '#00C9B1';
  if (score >= 5.5) return '#F59E0B';
  return '#EF4444';
}

function OverallGauge({ score }) {
  const pct = score != null ? Math.min(score / 9, 1) : 0;
  const circumference = 2 * Math.PI * 38;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="38" fill="none" stroke="#EEF2F6" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r="38"
          fill="none"
          stroke={score != null ? bandColor(score) : '#CBD5E1'}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold text-[#101828] leading-none">
          {score != null ? score.toFixed(1) : '—'}
        </span>
        <span className="text-[8px] text-gray-400 font-semibold mt-0.5">Overall</span>
      </div>
    </div>
  );
}

function CriteriaBars({ avgBands }) {
  const rows = CRITERIA.filter((c) => avgBands?.[c.key] != null);
  if (!rows.length) return null;

  return (
    <div className="flex-1 space-y-1.5 min-w-0">
      {rows.map(({ key, label, color }) => {
        const val = avgBands[key];
        const pct = Math.min((val / 9) * 100, 100);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-400 w-6 shrink-0">{label}</span>
            <div className="flex-1 h-[6px] bg-[#EEF2F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] font-bold text-[#101828] w-5 text-right shrink-0">
              {val.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ErrorFocusChart({ topErrors, errorsByCriteria }) {
  const items = (topErrors || []).slice(0, 4);
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
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Errors by area</p>
        {critItems.map((e) => (
          <div key={e.label} className="flex items-center gap-2">
            <span className="text-[10px] text-[#667085] w-[64px] shrink-0 truncate">{e.label}</span>
            <div className="flex-1 h-[5px] bg-[#EEF2F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1A96F3]"
                style={{ width: `${(e.count / max) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-semibold text-gray-400 w-4 text-right">{e.count}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Most frequent mistakes</p>
      {items.map((e) => (
        <div key={e.label} className="flex items-center gap-2">
          <span className="text-[10px] text-[#667085] flex-1 min-w-0 truncate" title={e.label}>
            {e.label}
          </span>
          <div className="w-[64px] h-[5px] bg-[#EEF2F6] rounded-full overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1A96F3] to-[#38BDF8]"
              style={{ width: `${((e.count || 1) / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-semibold text-gray-400 w-4 text-right shrink-0">×{e.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function LearningEditionSnapshot({ preview, locked }) {
  if (locked) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center">
        <p className="text-[12px] text-[#667085] leading-relaxed max-w-[220px]">
          Complete 5 graded exams to unlock band trends and error insights for this edition.
        </p>
      </div>
    );
  }

  const avgBands = preview?.avgBands;
  const hasBands = avgBands?.overall != null;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {hasBands && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shrink-0">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Edition band snapshot
          </p>
          <div className="flex items-center gap-3">
            <OverallGauge score={avgBands.overall} />
            <CriteriaBars avgBands={avgBands} />
          </div>
        </div>
      )}

      {(preview?.topErrors?.length > 0 || preview?.errorsByCriteria) && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 flex-1 min-h-0">
          <ErrorFocusChart
            topErrors={preview?.topErrors}
            errorsByCriteria={preview?.errorsByCriteria}
          />
        </div>
      )}
    </div>
  );
}
