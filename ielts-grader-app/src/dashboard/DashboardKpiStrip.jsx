import React from 'react';

const KpiCard = ({ label, value, loading }) => (
  <div className="bg-white rounded-[16px] border border-[#E5E7EB] px-4 py-4 md:px-5 md:py-5 shadow-sm">
    <p className="text-[10px] md:text-[11px] font-bold text-[#667085] uppercase tracking-widest mb-1.5">{label}</p>
    <p className="text-[22px] md:text-[26px] font-bold text-[#101828] leading-none tabular-nums">
      {loading ? '…' : value}
    </p>
  </div>
);

const DashboardKpiStrip = ({
  latestBand,
  targetBand,
  creditsRemaining,
  examsCount,
  thirdLabel = 'Credits Left',
  thirdValue,
  fourthLabel = 'Exams Done',
  fourthValue,
  loading,
}) => {
  const resolvedThird = thirdValue !== undefined ? thirdValue : creditsRemaining;
  const resolvedFourth = fourthValue !== undefined ? fourthValue : (examsCount ?? '—');

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <KpiCard
        label="Latest Band"
        value={latestBand != null ? Number(latestBand).toFixed(1) : '—'}
        loading={loading}
      />
      <KpiCard
        label="Target Band"
        value={Number(targetBand).toFixed(1)}
        loading={loading}
      />
      <KpiCard
        label={thirdLabel}
        value={resolvedThird}
        loading={loading}
      />
      <KpiCard
        label={fourthLabel}
        value={resolvedFourth}
        loading={loading}
      />
    </div>
  );
};

export default DashboardKpiStrip;
