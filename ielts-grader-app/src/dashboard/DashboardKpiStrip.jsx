import React from 'react';

const KpiCard = ({ label, value, loading }) => (
  <div className="bg-white rounded-[16px] border border-[#E5E7EB] px-4 py-4 md:px-5 md:py-5 shadow-sm">
    <p className="text-[10px] md:text-[11px] font-bold text-[#667085] uppercase tracking-widest mb-1.5">{label}</p>
    <p className="text-[22px] md:text-[26px] font-bold text-[#101828] leading-none tabular-nums">
      {loading ? '…' : value}
    </p>
  </div>
);

const DashboardKpiStrip = ({ latestBand, targetBand, creditsRemaining, examsCount, loading }) => (
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
      label="Credits Left"
      value={creditsRemaining}
      loading={loading}
    />
    <KpiCard
      label="Exams Done"
      value={examsCount ?? '—'}
      loading={loading}
    />
  </div>
);

export default DashboardKpiStrip;
