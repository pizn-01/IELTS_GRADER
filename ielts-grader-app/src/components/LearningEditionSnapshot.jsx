import React from 'react';

const CRITERIA = [
  { key: 'response', label: 'TR', full: 'Task Response', color: '#2563EB' },
  { key: 'coherence', label: 'CC', full: 'Coherence', color: '#7C3AED' },
  { key: 'vocabulary', label: 'LR', full: 'Lexical', color: '#059669' },
  { key: 'grammar', label: 'GRA', full: 'Grammar', color: '#DC2626' },
];

const CRITERIA_SHORT = {
  'Task Response': { label: 'TR', color: '#2563EB' },
  'Coherence and Cohesion': { label: 'CC', color: '#7C3AED' },
  'Lexical Resource': { label: 'LR', color: '#059669' },
  'Grammatical Range and Accuracy': { label: 'GRA', color: '#DC2626' },
};

function bandColor(score) {
  if (score >= 7) return '#00C9B1';
  if (score >= 5.5) return '#F59E0B';
  return '#EF4444';
}

export function BandSnapshot({ avgBands }) {
  if (!avgBands || avgBands.overall == null) return null;

  const pct = Math.min(avgBands.overall / 9, 1);
  const circumference = 2 * Math.PI * 44;
  const offset = circumference * (1 - pct);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-4 shrink-0 md:flex-1 md:min-h-0 flex flex-col justify-center min-h-[160px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
        Average bands · this edition
      </p>
      <div className="flex items-center gap-5">
        <div className="relative w-[96px] h-[96px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#EEF2F6" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={bandColor(avgBands.overall)}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-bold text-[#101828] leading-none">
              {avgBands.overall.toFixed(1)}
            </span>
            <span className="text-[9px] text-gray-400 font-semibold mt-0.5">Overall</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 min-w-0">
          {CRITERIA.filter((c) => avgBands[c.key] != null).map(({ key, label, color }) => {
            const val = avgBands[key];
            const width = Math.min((val / 9) * 100, 100);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 w-7 shrink-0">{label}</span>
                <div className="flex-1 h-[7px] bg-[#EEF2F6] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
                </div>
                <span className="text-[11px] font-bold text-[#101828] w-6 text-right shrink-0">
                  {val.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ErrorsByAreaChart({ errorsByCriteria }) {
  if (!errorsByCriteria || !Object.keys(errorsByCriteria).length) return null;

  const items = Object.entries(errorsByCriteria)
    .sort((a, b) => b[1] - a[1])
    .map(([crit, count]) => {
      const meta = CRITERIA_SHORT[crit] || { label: crit.slice(0, 3), color: '#64748B' };
      return { crit, count, ...meta };
    });
  const max = items.reduce((m, e) => Math.max(m, e.count), 1);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-4 shrink-0 md:flex-1 md:min-h-0 flex flex-col min-h-[140px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
        Errors by criterion
      </p>
      <div className="flex-1 flex flex-col justify-center space-y-3">
        {items.map((e) => (
          <div key={e.crit} className="flex items-center gap-3">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white w-8 text-center shrink-0"
              style={{ backgroundColor: e.color }}
            >
              {e.label}
            </span>
            <div className="flex-1 h-[8px] bg-[#EEF2F6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(e.count / max) * 100}%`, backgroundColor: e.color }}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#101828] w-6 text-right shrink-0">
              {e.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopMistakesList({ topErrors }) {
  if (!topErrors?.length) {
    return (
      <p className="text-[12px] text-gray-400 flex-1 flex items-center">
        No recurring mistakes flagged in this edition yet.
      </p>
    );
  }

  return (
    <ul className="flex-1 lg:min-h-0 overflow-y-auto max-h-[200px] lg:max-h-none space-y-2 pr-1">
      {topErrors.slice(0, 8).map((e, i) => {
        const meta = CRITERIA_SHORT[e.criteria] || { label: '—', color: '#94A3B8' };
        return (
          <li
            key={e.label}
            className="flex items-start gap-2.5 rounded-lg bg-[#F8FAFC] border border-[#EEF2F6] px-3 py-2.5"
          >
            <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0 pt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#101828] font-medium leading-snug">{e.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="text-[10px] text-gray-400">×{e.count} across exams</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
