import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import EventFunnelSection from './EventFunnelSection';

const formatRevenue = (cents) =>
  `$${((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DateRangeBar = ({ days, setDays }) => (
  <div className="flex gap-1.5">
    {[7, 30, 90].map((d) => (
      <button
        key={d}
        type="button"
        onClick={() => setDays(d)}
        className={`px-3 h-[28px] rounded-[6px] text-[11px] font-bold border transition-all ${
          days === d ? 'bg-[#2C3E50] text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        {d}d
      </button>
    ))}
  </div>
);

const MetricStrip = ({ items }) => (
  <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-gray-100 grid grid-cols-2 sm:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className="px-3.5 py-3">
        <p className="text-[22px] font-black text-[#101828] leading-none tabular-nums">{item.value}</p>
        <p className="text-[11px] font-semibold text-gray-500 mt-1">{item.label}</p>
        {item.sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{item.sub}</p>}
      </div>
    ))}
  </div>
);

const DashboardPanel = ({ title, children, footer }) => (
  <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-3.5 flex flex-col h-full">
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
    <div className="flex-1">{children}</div>
    {footer && <div className="mt-2 pt-2 border-t border-gray-50">{footer}</div>}
  </div>
);

const StatRow = ({ label, value, sub }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[12px] text-gray-500">{label}</span>
    <div className="text-right shrink-0">
      <span className="text-[12px] font-bold text-[#101828] tabular-nums">{value}</span>
      {sub && <p className="text-[10px] text-gray-400 leading-tight">{sub}</p>}
    </div>
  </div>
);

const AttentionRow = ({ label, count, tab, onNavigate, alwaysShow = false, alertLevel = 'neutral' }) => {
  if (!alwaysShow && count === 0) return null;

  const dotColor =
    alertLevel === 'red' && count > 0
      ? 'bg-red-500'
      : alertLevel === 'amber' && count > 0
        ? 'bg-amber-500'
        : 'bg-gray-300';

  const valueColor =
    alertLevel === 'red' && count > 0
      ? 'text-red-600'
      : alertLevel === 'amber' && count > 0
        ? 'text-amber-600'
        : 'text-gray-400';

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(tab)}
      className="w-full flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 rounded-[6px] px-0.5 -mx-0.5 transition-colors text-left"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-[12px] text-gray-600 flex-1">{label}</span>
      <span className={`text-[12px] font-bold tabular-nums ${valueColor}`}>{count}</span>
    </button>
  );
};

const PanelLink = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[11px] font-semibold text-[#2C3E50] hover:text-[#101828] transition-colors"
  >
    {label}
  </button>
);

const ExploreBar = ({ links, onNavigate }) => (
  <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] text-gray-500">
    {links.map((link, i) => (
      <React.Fragment key={link.tab}>
        {i > 0 && <span className="text-gray-300 select-none">·</span>}
        <button
          type="button"
          onClick={() => onNavigate?.(link.tab)}
          className="hover:text-[#101828] hover:underline transition-colors"
        >
          {link.label}
          {link.count != null && <span className="text-gray-400 ml-0.5">({link.count})</span>}
        </button>
      </React.Fragment>
    ))}
  </div>
);

export default function AdminOverview({ onNavigateTab }) {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [byCountry, setByCountry] = useState([]);
  const [funnelSteps, setFunnelSteps] = useState([]);
  const [freeTrialEngagement, setFreeTrialEngagement] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ts, co, funnel] = await Promise.all([
        api.admin.getStats({ days }),
        api.admin.getAcquisitionTimeseries({ days }),
        api.admin.getAcquisitionByCountry({ days }),
        api.admin.getEventsFunnel({ days }).catch(() => ({ steps: [] })),
      ]);
      setStats(s);
      setTimeseries(ts.data || []);
      setByCountry(co.data || []);
      setFunnelSteps(Array.isArray(funnel?.steps) ? funnel.steps : []);
      setFreeTrialEngagement(funnel?.free_trial_engagement || null);
    } catch {
      // keep prior data on error
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const acq = stats?.acquisition;
  const periodLabel = `Last ${days} days`;
  const periodShort = `${days}d`;

  const formatChartDate = (date) => {
    if (!date) return '';
    const [, month, day] = date.split('-');
    return `${month}/${day}`;
  };

  const timeseriesXTicks = (() => {
    if (!timeseries.length) return undefined;
    const step = days <= 7 ? 1 : days <= 30 ? 5 : 13;
    const ticks = [];
    for (let i = 0; i < timeseries.length; i += step) ticks.push(timeseries[i].date);
    const last = timeseries[timeseries.length - 1].date;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  })();
  const timeseriesXAngle = days > 14 ? -45 : 0;

  const ticketsOpenedPeriod = stats?.support?.opened_in_period ?? 0;
  const ticketsResolvedPeriod = stats?.support?.resolved_in_period ?? 0;
  const gradingInPeriod = stats?.submissions?.grading_in_period ?? 0;
  const failedPeriod = stats?.submissions?.failed_in_period ?? 0;
  const needsAttention =
    ticketsOpenedPeriod > 0 || gradingInPeriod > 0 || failedPeriod > 0;

  if (loading && !stats) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-gray-100 rounded-[12px] animate-pulse" />
        <div className="h-16 bg-gray-100 rounded-[12px] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-[180px] bg-gray-100 rounded-[12px] animate-pulse" />
          <div className="h-[180px] bg-gray-100 rounded-[12px] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-[180px] bg-gray-100 rounded-[12px] animate-pulse" />
          <div className="h-[180px] bg-gray-100 rounded-[12px] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-400 text-[13px]">Failed to load dashboard.</p>;
  }

  const sessionConversionRate = acq?.session_conversion_rate ?? acq?.conversion_rate ?? 0;
  const convertedSessions = acq?.converted_sessions ?? 0;
  const totalSessions = acq?.total_sessions ?? 0;
  const signupCount = acq?.signup_count ?? 0;

  const northStarItems = [
    {
      label: 'Revenue',
      value: formatRevenue(stats.payments?.revenue_cents_in_period),
      sub: `${stats.payments?.count_in_period ?? 0} payments · ${periodShort}`,
    },
    {
      label: 'Paid subs',
      value: stats.subscriptions?.new_in_period ?? 0,
      sub: `${stats.subscriptions?.active ?? 0} active now (live)`,
    },
    {
      label: 'Signups',
      value: signupCount,
      sub: totalSessions
        ? `${convertedSessions}/${totalSessions} linked (${sessionConversionRate}%)`
        : `no tracked sessions · ${periodShort}`,
    },
    {
      label: 'Sessions',
      value: totalSessions,
      sub: `${acq?.anonymous_sessions ?? 0} anonymous · ${periodShort}`,
    },
  ];

  const exploreLinks = [
    { tab: 'Users', label: 'Users', count: stats.users?.new_in_period },
    { tab: 'Acquisition', label: 'Acquisition' },
    { tab: 'Submissions', label: 'Submissions', count: stats.submissions?.total_in_period },
    { tab: 'Tasks', label: 'Tasks' },
    { tab: 'Assignments', label: 'Assignments', count: stats.assignments?.in_period },
    { tab: 'Discounts', label: 'Discounts' },
    { tab: 'Support', label: 'Support', count: ticketsOpenedPeriod },
  ];

  const topCountry = byCountry[0]?.country || '—';

  return (
    <div className={`space-y-3 transition-opacity ${loading ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[18px] font-black text-[#101828]">Overview</h1>
          <p className="text-[11px] text-gray-400">{periodLabel} · Toronto</p>
        </div>
        <div className="flex items-center gap-1.5">
          <DateRangeBar days={days} setDays={setDays} />
          <button
            type="button"
            onClick={load}
            className="p-1.5 border border-gray-200 rounded-[6px] hover:bg-gray-50"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <MetricStrip items={northStarItems} />

      <p className="text-[10px] text-gray-400 leading-snug">
        Conversion % = sessions linked to a signup ({convertedSessions}/{totalSessions}), not signups ÷ sessions.
        {signupCount > totalSessions && totalSessions > 0 && (
          <span> More signups than sessions is expected when attribution is missing.</span>
        )}
      </p>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="lg:col-span-2">
          <DashboardPanel title={`Sessions vs signups · ${periodShort}`}>
            <div className={days > 14 ? 'h-[180px]' : 'h-[160px]'}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeseries}
                  margin={{ top: 4, right: 8, left: 0, bottom: days > 14 ? 20 : 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    ticks={timeseriesXTicks}
                    tick={{ fontSize: 9 }}
                    tickFormatter={formatChartDate}
                    angle={timeseriesXAngle}
                    textAnchor={days > 14 ? 'end' : 'middle'}
                    height={days > 14 ? 48 : 24}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip labelFormatter={formatChartDate} />
                  <Line type="monotone" dataKey="sessions" stroke="#2C3E50" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Sessions" />
                  <Line type="monotone" dataKey="signups" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Signups" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>
        </div>

        <div className="lg:col-span-1">
          <DashboardPanel title={`Needs attention · ${periodShort}`}>
            {!needsAttention ? (
              <p className="text-[12px] text-gray-400 py-2">All clear. Nothing needs attention.</p>
            ) : (
              <>
                <AttentionRow
                  label="Tickets opened"
                  count={ticketsOpenedPeriod}
                  tab="Support"
                  onNavigate={onNavigateTab}
                  alertLevel="red"
                />
                <AttentionRow
                  label="Grading in period"
                  count={gradingInPeriod}
                  tab="Submissions"
                  onNavigate={onNavigateTab}
                  alwaysShow
                  alertLevel="amber"
                />
                <AttentionRow
                  label="Failed exams"
                  count={failedPeriod}
                  tab="Submissions"
                  onNavigate={onNavigateTab}
                  alertLevel="red"
                />
                <StatRow
                  label="Tickets resolved"
                  value={ticketsResolvedPeriod}
                  sub={`in ${periodShort}`}
                />
              </>
            )}
          </DashboardPanel>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <DashboardPanel
          title={`Acquisition · ${periodShort}`}
          footer={<PanelLink label="View Acquisition →" onClick={() => onNavigateTab?.('Acquisition')} />}
        >
          <StatRow label="Pageviews" value={acq?.total_pageviews ?? 0} />
          <StatRow label="Bounce rate" value={`${acq?.bounce_rate ?? 0}%`} />
          <StatRow label="Avg pages / session" value={acq?.avg_pages_per_session ?? 0} />
          <StatRow
            label="Sessions linked to signup"
            value={`${convertedSessions} / ${totalSessions}`}
            sub={`${sessionConversionRate}% of sessions`}
          />
          <StatRow label="Top channel" value={(acq?.top_channel || '—').replace(/_/g, ' ')} />
          <StatRow label="Top country" value={topCountry} />
          <StatRow
            label="New users"
            value={stats.users?.new_in_period ?? 0}
            sub={days === 7 ? `+${stats.users?.new_this_week ?? 0} this week` : undefined}
          />
        </DashboardPanel>

        <DashboardPanel
          title={`Product & ops · ${periodShort}`}
          footer={
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <PanelLink label="View Submissions →" onClick={() => onNavigateTab?.('Submissions')} />
              <PanelLink label="View Tasks →" onClick={() => onNavigateTab?.('Tasks')} />
            </div>
          }
        >
          <StatRow label="Exams taken" value={stats.submissions?.total_in_period ?? 0} />
          <StatRow label="Graded rate" value={`${stats.submissions?.grading_rate_in_period ?? 0}%`} />
          <StatRow label="Graded" value={stats.submissions?.graded_in_period ?? 0} />
          <StatRow label="Question assignments" value={stats.assignments?.in_period ?? 0} />
          <StatRow label="Revenue" value={formatRevenue(stats.payments?.revenue_cents_in_period)} sub={`${periodShort} window`} />
          <StatRow label="All-time revenue" value={formatRevenue(stats.payments?.revenue_cents_all_time)} />
          <StatRow
            label="Active discounts"
            value={stats.discounts?.active ?? 0}
            sub="current inventory"
          />
        </DashboardPanel>
      </div>

      <EventFunnelSection
        steps={funnelSteps}
        freeTrialEngagement={freeTrialEngagement}
        periodShort={periodShort}
        loading={loading}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ExploreBar links={exploreLinks} onNavigate={onNavigateTab} />
        <span className="text-[10px] text-gray-400">Counts for {periodShort}</span>
      </div>
    </div>
  );
}
