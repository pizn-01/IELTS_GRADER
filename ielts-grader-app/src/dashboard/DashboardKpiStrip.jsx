import React from 'react';
import { formatGoalGap, goalProgressPercent } from '../utils/goalProgress';

const SupportMetric = ({ label, value, loading, accent }) => (
  <div className="flex flex-col justify-center min-w-0 px-3 py-2 sm:px-3.5">
    <p className="text-[9px] md:text-[10px] font-bold text-[#667085] uppercase tracking-widest mb-0.5">
      {label}
    </p>
    <p
      className={`text-[17px] md:text-[19px] font-bold leading-none tabular-nums ${
        accent ? 'text-[#1A96F3]' : 'text-[#101828]'
      }`}
    >
      {loading ? '…' : value}
    </p>
  </div>
);

const DashboardKpiStrip = ({
  latestBand,
  targetBand,
  creditsRemaining,
  examsCount,
  loading,
  learningFootnote,
}) => {
  const goalGap = formatGoalGap(latestBand, targetBand);
  const goalPct = goalProgressPercent(latestBand, targetBand);
  const reachedGoal = latestBand != null && targetBand != null && latestBand >= targetBand;

  return (
    <div className="space-y-1.5">
      <div className="bg-white/95 backdrop-blur-sm rounded-[14px] border border-[#E5E7EB] shadow-[0_4px_24px_rgba(26,31,54,0.06)] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-stretch min-w-0">
          {/* Hero: Latest Band */}
          <div className="relative flex items-center px-3.5 py-2.5 sm:min-w-[220px] sm:max-w-[300px] border-b sm:border-b-0 sm:border-r border-[#E5E7EB] overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 80% 100% at 0% 50%, rgba(26,150,243,0.10), transparent 70%)',
              }}
            />
            <div className="relative z-10 flex items-center gap-3 w-full min-w-0">
              <div className="shrink-0">
                <p className="text-[9px] md:text-[10px] font-bold text-[#667085] uppercase tracking-widest mb-0.5">
                  Latest Band
                </p>
                <p className="text-[28px] md:text-[30px] font-bold text-[#101828] leading-none tabular-nums tracking-tight">
                  {loading ? '…' : latestBand != null ? Number(latestBand).toFixed(1) : '—'}
                </p>
              </div>
              {targetBand != null && (
                <div className="flex-1 min-w-0 max-w-[130px]">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[9px] font-semibold text-[#667085]">To goal</span>
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        reachedGoal ? 'text-[#00C9B1]' : 'text-[#344054]'
                      }`}
                    >
                      {loading ? '…' : goalGap}
                    </span>
                  </div>
                  <div className="h-1 bg-[#F2F4F7] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        reachedGoal ? 'bg-[#00C9B1]' : 'bg-[#1A96F3]'
                      }`}
                      style={{ width: `${loading ? 0 : goalPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Supports */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-[#E5E7EB] min-w-0">
            <SupportMetric
              label="Target Band"
              value={Number(targetBand).toFixed(1)}
              loading={loading}
            />
            <SupportMetric
              label="Credits Left"
              value={creditsRemaining}
              loading={loading}
              accent
            />
            <SupportMetric
              label="Exams Done"
              value={examsCount ?? '—'}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {learningFootnote && (
        <p className="text-[11px] text-[#667085] font-medium px-0.5">{learningFootnote}</p>
      )}
    </div>
  );
};

export default DashboardKpiStrip;
