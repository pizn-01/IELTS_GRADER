import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_LINES = [
  { label: 'Overall Band', dataKey: 'overall', color: '#EA4335' },
  { label: 'Task Response', dataKey: 'response', color: '#F59E0B' },
  { label: 'Coherence', dataKey: 'coherence', color: '#00C9B1' },
  { label: 'Vocabulary', dataKey: 'vocabulary', color: '#8B62F3' },
  { label: 'Grammar', dataKey: 'grammar', color: '#1A96F3' },
];

function Panel({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] flex flex-col overflow-hidden min-h-0 ${className}`}>
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
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex flex-col gap-2 min-h-0">
      <h4 className="text-[12px] font-bold text-[#101828] truncate">{item.label}</h4>
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[10px] text-[#667085] font-medium">First</p>
          <p className="text-[13px] font-bold text-gray-400">{item.first}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#667085] font-medium">Latest</p>
          <p className="text-[13px] font-bold text-[#101828]">{item.latest}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#667085] font-medium">Growth</p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.positive ? 'bg-[#F0FDF9] text-[#30C3A9] border-[#30C3A94D]' : 'bg-[#FFF5F5] text-[#EF4444] border-[#FEE2E2]'}`}>
            {item.growth}
          </span>
        </div>
      </div>
    </div>
  );
}

function MistakeRow({ item, compact = false }) {
  const type = item.type === 'red' ? 'red' : item.type === 'yellow' ? 'yellow' : 'gray';
  const colors = {
    red: 'text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]',
    yellow: 'text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]',
    gray: 'text-[#344054] bg-[#F2F4F7] border-[#D0D5DD]',
  };
  return (
    <div className={`flex items-center justify-between gap-2 ${compact ? 'py-2' : 'py-2.5'} border-b border-[#F2F4F7] last:border-0`}>
      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold truncate ${colors[type]}`}>
        {item.label}
      </span>
      <span className="px-2 py-0.5 bg-[#1018280D] rounded-full text-[10px] font-bold text-[#101828] shrink-0">
        {item.count != null ? `Count: ${item.count}` : item.impact}
      </span>
    </div>
  );
}

function HighImpactRow({ item }) {
  const type = item.type === 'red' ? 'red' : 'yellow';
  const colors = {
    red: 'text-[#D92D20] bg-[#FEF3F2] border-[#FDA29B]',
    yellow: 'text-[#DC6803] bg-[#FFFAEB] border-[#FEC84B]',
  };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-[#F2F4F7] last:border-0">
      <span className="text-[11px] font-bold text-[#344054] truncate">{item.label}</span>
      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${colors[type]}`}>
        {item.impact || (type === 'red' ? 'High Impact' : 'Medium Impact')}
      </span>
    </div>
  );
}

export default function PerformanceOverviewDashboard({
  loading = false,
  latestBand,
  firstBand,
  avgBand,
  bestBand,
  change,
  changePositive = true,
  examCount,
  studyPeriod,
  trendLabel,
  trendDetail,
  topPriorityText,
  insightsPanel,
  chartData = [],
  chartYDomain = [0, 9],
  chartTicks,
  frequentErrors = [],
  totalInstances = 0,
  uniqueTypes = 0,
  criterionCards = [],
}) {
  const changeColor = change == null ? '#101828' : changePositive ? '#00C9B1' : '#EF4444';
  const formattedChange = change == null ? '—' : `${changePositive && parseFloat(change) >= 0 ? '+' : ''}${change}`;

  return (
    <div className="bg-[#F4F6F8] rounded-2xl border border-[#E5E7EB] p-3 lg:p-4">
      <div className="flex flex-col gap-3 xl:grid xl:grid-rows-[auto_auto_1fr] xl:gap-3 xl:h-[calc(100vh-13.5rem)] xl:min-h-[600px] xl:max-h-[780px]">
        {/* KPI strip */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] flex items-center divide-x divide-[#E5E7EB] h-[68px] shrink-0 overflow-x-auto">
          <div className="flex-1 min-w-[100px] pl-4 flex flex-col justify-center">
            <span className="text-[28px] font-semibold text-[#101828] leading-none">{loading ? '…' : latestBand ?? '—'}</span>
            <span className="text-[11px] text-[#667085] mt-1 font-medium">Latest Band</span>
          </div>
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

        {/* Insight row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <Panel title="Activity Profile">
            <div className="p-3 grid grid-cols-2 gap-3 flex-1">
              <div>
                <p className="text-[10px] text-[#667085] font-medium mb-0.5">Exams Completed</p>
                <p className="text-[20px] font-bold text-[#101828] leading-none">{loading ? '…' : examCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#667085] font-medium mb-0.5">Study Period</p>
                <p className="text-[12px] font-bold text-[#101828] leading-snug">{loading ? '…' : studyPeriod}</p>
              </div>
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

        {/* Main analytics body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 xl:flex-1">
          {/* Left: chart + criterion grid */}
          <div className="lg:col-span-8 flex flex-col gap-3 min-h-0">
            <Panel className="flex-1 min-h-[180px]">
              <div className="px-3 pt-2 pb-1 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <h3 className="text-[13px] font-bold text-[#101828]">Skill Growth</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {CHART_LINES.map((line) => (
                    <div key={line.dataKey} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                      <span className="text-[9px] font-bold text-[#667085]">{line.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-[140px] px-1 pb-2">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#1A96F3] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#667085', fontSize: 10, fontWeight: 600 }} dy={4} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#667085', fontSize: 10, fontWeight: 600 }}
                        domain={chartYDomain}
                        ticks={chartTicks}
                        tickFormatter={(v) => v.toFixed(1)}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', padding: '8px', fontSize: '11px' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                      />
                      {CHART_LINES.map((line) => (
                        <Line key={line.dataKey} type="linear" dataKey={line.dataKey} stroke={line.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              {[criterionCards[0], criterionCards[2], criterionCards[1], criterionCards[3]].filter(Boolean).map((item) => (
                <CriterionMini key={item.label} item={item} />
              ))}
            </div>
          </div>

          {/* Right: mistakes + high impact */}
          <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
            <Panel title="Mistake Frequency" className="flex-1 min-h-[160px]">
              <div className="p-3 flex flex-col flex-1 min-h-0">
                <div className="bg-[#F9FAFB] rounded-lg px-2 py-1.5 flex items-center justify-between mb-2 shrink-0 text-[10px] font-semibold text-[#475467]">
                  <span>Total: <span className="text-[#101828]">{totalInstances}</span></span>
                  <span>Types: <span className="text-[#101828]">{uniqueTypes}</span></span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                  {frequentErrors.length === 0 ? (
                    <p className="text-[11px] text-gray-400 py-2">No error data yet.</p>
                  ) : (
                    frequentErrors.map((item, i) => <MistakeRow key={i} item={item} compact />)
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="High-Impact Areas to Fix" className="flex-1 min-h-[160px]">
              <div className="p-3 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {frequentErrors.length === 0 ? (
                  <p className="text-[11px] text-gray-400 py-2">No data yet.</p>
                ) : (
                  frequentErrors.map((item, i) => <HighImpactRow key={i} item={item} />)
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
