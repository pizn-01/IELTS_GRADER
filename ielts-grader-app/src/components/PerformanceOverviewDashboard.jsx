import React from 'react';
import { AlertCircle, AlertTriangle, ChevronRight, MinusCircle } from 'lucide-react';

function Panel({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] flex flex-col overflow-hidden min-h-0 min-w-0 ${className}`}>
      {title && (
        <div className="px-3 py-2 border-b border-[#F2F4F7] shrink-0">
          <h3 className="text-[13px] font-bold text-[#101828]">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function CriterionMini({ item }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex flex-col gap-1.5 min-w-0 overflow-hidden">
      <h4 className="text-[11px] font-bold text-[#101828] truncate">{item.label}</h4>
      <div className="grid grid-cols-3 gap-1 text-center min-w-0">
        <div className="min-w-0">
          <p className="text-[9px] text-[#667085] font-medium">First</p>
          <p className="text-[12px] font-bold text-gray-400 truncate">{item.first}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] text-[#667085] font-medium">Latest</p>
          <p className="text-[12px] font-bold text-[#101828] truncate">{item.latest}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] text-[#667085] font-medium">Growth</p>
          <span className={`inline-block max-w-full truncate px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${item.positive ? 'bg-[#F0FDF9] text-[#30C3A9] border-[#30C3A94D]' : 'bg-[#FFF5F5] text-[#EF4444] border-[#FEE2E2]'}`}>
            {item.growth}
          </span>
        </div>
      </div>
    </div>
  );
}

function ImpactIcon({ item }) {
  const isHigh = item.type === 'red' || item.impact === 'High Impact';
  const isMed = !isHigh && (item.type === 'yellow' || item.impact === 'Medium Impact');
  if (isHigh) {
    return (
      <span className="shrink-0 w-5 h-5 rounded-full bg-[#FEF3F2] border border-[#FDA29B] flex items-center justify-center" title="High Impact">
        <AlertCircle size={11} className="text-[#D92D20]" strokeWidth={2.5} />
      </span>
    );
  }
  if (isMed) {
    return (
      <span className="shrink-0 w-5 h-5 rounded-full bg-[#FFFAEB] border border-[#FEC84B] flex items-center justify-center" title="Medium Impact">
        <AlertTriangle size={11} className="text-[#DC6803]" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="shrink-0 w-5 h-5 rounded-full bg-[#F2F4F7] border border-[#D0D5DD] flex items-center justify-center" title="Low Impact">
      <MinusCircle size={11} className="text-[#667085]" strokeWidth={2.5} />
    </span>
  );
}

function ErrorImpactRow({ item }) {
  const isHigh = item.type === 'red' || item.impact === 'High Impact';
  const isMed = !isHigh && (item.type === 'yellow' || item.impact === 'Medium Impact');
  const impactLabel = isHigh ? 'High' : isMed ? 'Medium' : 'Low';

  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#F2F4F7] last:border-0 min-w-0">
      <ImpactIcon item={item} />
      <span className="text-[11px] font-semibold text-[#344054] truncate flex-1 min-w-0">{item.label}</span>
      <span className="text-[10px] font-bold text-[#667085] shrink-0 hidden sm:inline">{impactLabel}</span>
      <span className="px-1.5 py-0.5 bg-[#1018280D] rounded-full text-[10px] font-bold text-[#101828] shrink-0">
        {item.count ?? 0}
      </span>
    </div>
  );
}

/** Standalone Errors & Impact panel for Dashboard Overview right column. */
export function ErrorsImpactPanel({
  frequentErrors = [],
  totalInstances = 0,
  uniqueTypes = 0,
  loading = false,
  onOpenFixCards,
  className = '',
}) {
  const topErrors = frequentErrors.slice(0, 3);

  return (
    <Panel title="Errors & Impact" className={`min-h-[200px] ${className}`}>
      <div className="p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="bg-[#F9FAFB] rounded-lg px-2 py-1.5 flex items-center justify-between mb-2 shrink-0 text-[10px] font-semibold text-[#475467]">
          <span>Total: <span className="text-[#101828]">{loading ? '…' : totalInstances}</span></span>
          <span>Types: <span className="text-[#101828]">{loading ? '…' : uniqueTypes}</span></span>
        </div>
        <div className="flex items-center gap-3 mb-2 shrink-0 text-[9px] font-semibold text-[#667085]">
          <span className="flex items-center gap-1"><AlertCircle size={10} className="text-[#D92D20]" /> High</span>
          <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-[#DC6803]" /> Medium</span>
          <span className="flex items-center gap-1"><MinusCircle size={10} className="text-[#667085]" /> Low</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-0.5">
          {loading ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-[#F2F4F7] rounded animate-pulse" />
              ))}
            </div>
          ) : topErrors.length === 0 ? (
            <p className="text-[11px] text-gray-400 py-2">No error data yet.</p>
          ) : (
            topErrors.map((item, i) => <ErrorImpactRow key={i} item={item} />)
          )}
        </div>
        {typeof onOpenFixCards === 'function' && (
          <button
            type="button"
            onClick={onOpenFixCards}
            className="mt-2 shrink-0 w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold text-[#175CD3] bg-[#EFF8FF] border border-[#B2DDFF] hover:bg-[#D1E9FF] transition-colors"
          >
            See all Fix Cards
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </Panel>
  );
}

/**
 * Unique Overview insights (no duplicate Latest/Target/Exams KPI, goal bar, or Skill Growth chart).
 * Errors & Impact lives in ErrorsImpactPanel on the Dashboard right column.
 */
export default function PerformanceOverviewDashboard({
  loading = false,
  firstBand,
  avgBand,
  bestBand,
  change,
  changePositive = true,
  studyPeriod,
  trendLabel,
  trendDetail,
  topPriorityText,
  insightsPanel,
  criterionCards = [],
}) {
  const changeColor = change == null ? '#101828' : changePositive ? '#00C9B1' : '#EF4444';
  const formattedChange = change == null ? '—' : `${changePositive && parseFloat(change) >= 0 ? '+' : ''}${change}`;

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* First / Avg / Best / Change — Latest lives in Dashboard KPI */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] flex items-center divide-x divide-[#E5E7EB] h-[60px] shrink-0 overflow-x-auto">
        {[
          { label: 'First', value: firstBand },
          { label: 'Average', value: avgBand },
          { label: 'Best', value: bestBand },
          { label: 'Change', value: formattedChange, color: changeColor },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 min-w-[72px] flex flex-col items-center justify-center px-2">
            <span className="text-[10px] text-[#667085] font-medium">{label}</span>
            <span className="text-[18px] font-semibold leading-tight" style={{ color: color || '#101828' }}>
              {loading ? '…' : value ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Insight row — Study Period only (Exams Done is in Dashboard KPI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 min-w-0">
        <Panel title="Activity Profile">
          <div className="p-3 flex-1 min-w-0">
            <p className="text-[10px] text-[#667085] font-medium mb-0.5">Study Period</p>
            <p className="text-[13px] font-bold text-[#101828] leading-snug break-words">
              {loading ? '…' : studyPeriod}
            </p>
          </div>
        </Panel>

        <Panel title="Executive Summary">
          <div className="p-3 space-y-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <div>
              <p className="text-[12px] font-bold text-[#101828]">{trendLabel}</p>
              <p className="text-[11px] text-[#475467] leading-snug mt-0.5">{trendDetail}</p>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#101828]">Top Priority Fixes</p>
              <p className="text-[11px] text-[#475467] leading-snug mt-0.5">{topPriorityText}</p>
            </div>
          </div>
        </Panel>

        <Panel title={insightsPanel?.title || 'Insights'}>
          <div className="p-3 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {insightsPanel?.content}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0 min-w-0">
        {[criterionCards[0], criterionCards[2], criterionCards[1], criterionCards[3]].filter(Boolean).map((item) => (
          <CriterionMini key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
