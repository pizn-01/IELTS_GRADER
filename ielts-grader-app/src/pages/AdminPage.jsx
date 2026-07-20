import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ExamQuestionPanel from '../components/ExamQuestionPanel';
import AdminOverview from '../components/admin/AdminOverview';
import { buildPreviewQuestionText } from '../utils/buildPreviewQuestionText';
import { extractFileText } from '../utils/extractFileText';
import { Users, BarChart2, FileText, MessageSquare, Tag, LogOut, RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Search, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, AlertCircle, BookOpen, History, Eye, Menu, X as CloseIcon, Upload, ClipboardList, FileJson, Image as ImageIcon, Globe, Share2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import SocialOpsTab from '../components/admin/SocialOpsTab';

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });

const TABS = ['Overview', 'Users', 'Acquisition', 'Social Ops', 'Submissions', 'Tasks', 'Assignments', 'Discounts', 'Support'];

const CHANNEL_OPTIONS = [
  '', 'direct', 'google_organic', 'google_ads', 'facebook', 'instagram', 'reddit', 'quora',
  'twitter', 'linkedin', 'tiktok', 'youtube', 'email', 'referral',
];

const channelColor = (ch) => {
  const map = {
    google_ads: 'blue', google_organic: 'blue', facebook: 'blue', instagram: 'yellow',
    reddit: 'red', quora: 'green', twitter: 'blue', direct: 'gray', email: 'green', referral: 'yellow',
  };
  return map[ch] || 'gray';
};

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const formatReferrerLabel = (referrer) => {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
    return `${host}${path}`;
  } catch {
    return referrer;
  }
};

const formatAdminDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const subscriptionStatusPill = (status, cancelAtPeriodEnd) => {
  const normalized = (status || '').toLowerCase();
  // cancel_at_period_end is optional; Active + period end still means access until that date
  if (normalized === 'active' && cancelAtPeriodEnd) return <Pill label="Canceling" color="yellow" />;
  if (normalized === 'active') return <Pill label="Active" color="green" />;
  if (normalized === 'canceled' || normalized === 'cancelled') return <Pill label="Canceled" color="red" />;
  if (normalized === 'past_due') return <Pill label="Past due" color="yellow" />;
  if (normalized === 'trialing') return <Pill label="Trialing" color="blue" />;
  return <Pill label="Free" color="gray" />;
};

const formatPlanLabel = (plan) => {
  if (plan === 'weekly') return 'Weekly';
  if (plan === 'monthly') return 'Monthly';
  return '—';
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const Pill = ({ label, color }) => {
  const map = {
    green:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    red:    'bg-red-50 text-red-600 border border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    blue:   'bg-blue-50 text-blue-700 border border-blue-200',
    gray:   'bg-gray-100 text-gray-500 border border-gray-200',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${map[color] || map.gray}`}>{label}</span>;
};

const Stat = ({ label, value, sub }) => (
  <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-6">
    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-[32px] font-black text-[#101828] leading-none">{value ?? '—'}</p>
    {sub && <p className="text-[12px] text-gray-400 mt-1">{sub}</p>}
  </div>
);

const DateRangeBar = ({ days, setDays }) => (
  <div className="flex gap-2">
    {[7, 30, 90].map(d => (
      <button
        key={d}
        onClick={() => setDays(d)}
        className={`px-4 h-[34px] rounded-[8px] text-[12px] font-bold border transition-all ${days === d ? 'bg-[#2C3E50] text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
      >
        {d}d
      </button>
    ))}
  </div>
);

// ── Users Tab ─────────────────────────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [page, setPage]     = useState(1);
  const [editing, setEditing]   = useState(null); // { id, credits_remaining, target_band, is_admin }
  const [deleting, setDeleting] = useState(null); // user object pending confirmation
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    const params = { page, per_page: 20, search };
    if (channel) params.channel = channel;
    api.admin.getUsers(params).then(r => setUsers(r.data || [])).catch(() => {});
  }, [page, search, channel]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    setSaving(true);
    await api.admin.deleteUser(deleting.id).catch(() => {});
    setSaving(false);
    setDeleting(null);
    load();
  };

  const save = async () => {
    setSaving(true);
    await api.admin.updateUser(editing.id, {
      credits_remaining: parseInt(editing.credits_remaining),
      target_band: parseFloat(editing.target_band),
      is_admin: editing.is_admin,
    }).catch(() => {});
    setSaving(false);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email…" className="w-full pl-9 pr-4 h-[40px] border border-gray-200 rounded-[10px] text-[13px] outline-none focus:border-blue-400" />
        </div>
        <select
          value={channel}
          onChange={e => { setChannel(e.target.value); setPage(1); }}
          className="h-[40px] border border-gray-200 rounded-[10px] px-3 text-[13px] text-gray-600 outline-none focus:border-blue-400"
        >
          <option value="">All channels</option>
          {CHANNEL_OPTIONS.filter(Boolean).map(ch => (
            <option key={ch} value={ch}>{ch.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button onClick={load} className="p-2 border border-gray-200 rounded-[10px] hover:bg-gray-50"><RefreshCw size={16} className="text-gray-400" /></button>
      </div>

      <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
        <table className="w-full text-[13px] min-w-[1100px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              {['Name', 'Email', 'Channel', 'Landing', 'Country', 'Campaign', 'Credits', 'Plan', 'Status', 'Period end', 'Target', 'Exams', 'Admin', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-[#101828]">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  {u.acquisition_channel
                    ? <Pill label={u.acquisition_channel.replace(/_/g, ' ')} color={channelColor(u.acquisition_channel)} />
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate" title={u.landing_path}>{u.landing_path || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{u.acquisition_country || '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[100px] truncate" title={u.utm_campaign}>{u.utm_campaign || '—'}</td>
                <td className="px-4 py-3 font-bold text-[#101828]">{u.credits_remaining}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatPlanLabel(u.subscription_plan)}</td>
                <td className="px-4 py-3">{subscriptionStatusPill(u.subscription_status, u.cancel_at_period_end)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatAdminDate(u.subscription_period_end)}</td>
                <td className="px-4 py-3 text-gray-500">{u.target_band}</td>
                <td className="px-4 py-3 text-gray-500">{u.submission_count}</td>
                <td className="px-4 py-3">{u.is_admin ? <Pill label="Admin" color="blue" /> : <Pill label="User" color="gray" />}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing({ ...u })} className="text-[12px] font-bold text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => setDeleting(u)} className="text-[12px] font-bold text-red-500 hover:text-red-700 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={14} className="px-5 py-8 text-center text-gray-400">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="text-[13px] text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleting(null)} />
          <div className="relative bg-white rounded-[20px] w-[380px] p-7 shadow-2xl space-y-5">
            <h3 className="text-[16px] font-bold text-[#101828]">Delete User</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-[#101828]">{deleting.full_name || deleting.email}</span>? This cannot be undone. All their data will be removed.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleting(null)} className="flex-1 h-[40px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
              <button onClick={confirmDelete} disabled={saving} className="flex-1 h-[40px] bg-red-500 text-white rounded-[10px] text-[13px] font-bold hover:bg-red-600 disabled:opacity-50">{saving ? 'Deleting…' : 'Delete User'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-[20px] w-[380px] p-7 shadow-2xl space-y-5">
            <h3 className="text-[16px] font-bold text-[#101828]">Edit: {editing.full_name || editing.email}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-gray-500 block mb-1">Credits Remaining</label>
                <input type="number" min="0" value={editing.credits_remaining} onChange={e => setEditing(x => ({ ...x, credits_remaining: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[12px] font-bold text-gray-500 block mb-1">Target Band</label>
                <input type="number" step="0.5" min="1" max="9" value={editing.target_band} onChange={e => setEditing(x => ({ ...x, target_band: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-gray-500">Admin Access</label>
                <button onClick={() => setEditing(x => ({ ...x, is_admin: !x.is_admin }))} className="text-blue-600">
                  {editing.is_admin ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-300" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 h-[40px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 h-[40px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Acquisition Tab ───────────────────────────────────────────────────────────
const AcquisitionTab = () => {
  const [days, setDays] = useState(7);
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [byChannel, setByChannel] = useState([]);
  const [byCountry, setByCountry] = useState([]);
  const [byHour, setByHour] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [visitorPage, setVisitorPage] = useState(1);
  const [visitorChannel, setVisitorChannel] = useState('');
  const [visitorTotal, setVisitorTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { days };
      const visitorParams = { days, page: visitorPage, per_page: 20, converted: 'false' };
      if (visitorChannel) visitorParams.channel = visitorChannel;

      const [ov, ts, ch, co, hr, vis] = await Promise.all([
        api.admin.getAcquisitionOverview(params),
        api.admin.getAcquisitionTimeseries(params),
        api.admin.getAcquisitionByChannel(params),
        api.admin.getAcquisitionByCountry(params),
        api.admin.getAcquisitionByHour(params),
        api.admin.getAcquisitionVisitors(visitorParams),
      ]);

      setOverview(ov);
      setTimeseries(ts.data || []);
      setByChannel(ch.data || []);
      setByCountry(co.data || []);
      setByHour(hr.data || []);
      setVisitors(vis.data || []);
      setVisitorTotal(vis.total || 0);
    } catch {
      // keep prior data on error
    } finally {
      setLoading(false);
    }
  }, [days, visitorPage, visitorChannel]);

  useEffect(() => { load(); }, [load]);

  if (loading && !overview) {
    return <p className="text-gray-400 text-[14px] p-8">Loading acquisition data…</p>;
  }

  const hourChartData = byHour.map(h => ({
    label: h.label || `${h.hour}:00`,
    sessions: h.sessions,
  }));

  const timeseriesSessionTotal = timeseries.reduce((sum, row) => sum + (row.sessions || 0), 0);
  const channelSessionTotal = byChannel.reduce((sum, row) => sum + (row.sessions || 0), 0);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={load} className="p-2 border border-gray-200 rounded-[10px] hover:bg-gray-50">
          <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Stat label="Sessions" value={overview.total_sessions} sub={`${overview.anonymous_sessions ?? 0} anonymous`} />
          <Stat label="Pageviews" value={overview.total_pageviews} sub="total page loads" />
          <Stat label="Bounce Rate" value={`${overview.bounce_rate}%`} />
          <Stat label="Avg Pages" value={overview.avg_pages_per_session} sub="per session" />
          <Stat label="Signups" value={overview.signup_count} sub={`${overview.converted_sessions ?? 0} linked to session`} />
          <Stat label="Top Channel" value={(overview.top_channel || '—').replace(/_/g, ' ')} />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[#101828]">Charts</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Last {days} days · Toronto time · all charts update together</p>
        </div>
        <DateRangeBar days={days} setDays={d => { setDays(d); setVisitorPage(1); }} />
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="bg-white rounded-[16px] border border-gray-100 p-5 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sessions vs Signups</p>
          <p className="text-[11px] text-gray-400 mb-4">
            Daily totals. {timeseriesSessionTotal} sessions in chart ({overview?.total_sessions ?? 0} in period).
          </p>
          <div className={days > 14 ? 'h-[280px]' : 'h-[240px]'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeseries}
                margin={{ top: 8, right: 12, left: 0, bottom: days > 14 ? 28 : 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  ticks={timeseriesXTicks}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatChartDate}
                  angle={timeseriesXAngle}
                  textAnchor={days > 14 ? 'end' : 'middle'}
                  height={days > 14 ? 60 : 30}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                <Tooltip labelFormatter={formatChartDate} />
                <Line type="monotone" dataKey="sessions" stroke="#2C3E50" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Sessions" />
                <Line type="monotone" dataKey="signups" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-gray-100 p-5 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sessions by Channel</p>
          <p className="text-[11px] text-gray-400 mb-4">{channelSessionTotal} sessions total (same as KPI above)</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byChannel.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={75} tickFormatter={v => v.replace(/_/g, ' ')} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#2C3E50" name="Sessions" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-gray-100 p-5 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-4">Top Countries</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCountry.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={35} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-gray-100 p-5 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-4">Sessions by Hour (Toronto)</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#6366F1" name="Sessions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#101828]">Anonymous Visitors</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Excludes sessions that signed up ({overview?.converted_sessions ?? 0} converted)</p>
          </div>
          <select
            value={visitorChannel}
            onChange={e => { setVisitorChannel(e.target.value); setVisitorPage(1); }}
            className="h-[36px] border border-gray-200 rounded-[8px] px-3 text-[12px] text-gray-600 outline-none"
          >
            <option value="">All channels</option>
            {CHANNEL_OPTIONS.filter(Boolean).map(ch => (
              <option key={ch} value={ch}>{ch.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
          <table className="w-full text-[12px] min-w-[1080px]">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
              <tr>
                {[
                  { label: 'First Seen', className: 'px-3 py-3 min-w-[130px]' },
                  { label: 'Channel', className: 'px-3 py-3' },
                  { label: 'Landing', className: 'px-3 py-3 max-w-[100px]' },
                  { label: 'Referrer', className: 'px-3 py-3 max-w-[120px]', title: 'External URL the visitor came from' },
                  { label: 'UTM Src', className: 'px-3 py-3 max-w-[72px]', title: 'utm_source' },
                  { label: 'UTM Med', className: 'px-3 py-3 max-w-[72px]', title: 'utm_medium' },
                  { label: 'Country', className: 'px-3 py-3' },
                  { label: 'Pages', className: 'px-3 py-3' },
                  { label: 'Duration', className: 'px-3 py-3' },
                  { label: 'Device', className: 'px-3 py-3' },
                ].map((h) => (
                  <th key={h.label} className={`text-left ${h.className}`} title={h.title}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visitors.map(v => (
                <tr key={v.session_id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{new Date(v.first_seen_at).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <Pill label={(v.channel || 'direct').replace(/_/g, ' ')} color={channelColor(v.channel)} />
                  </td>
                  <td className="px-3 py-3 text-gray-500 max-w-[100px] truncate" title={v.landing_path}>{v.landing_path || '/'}</td>
                  <td
                    className="px-3 py-3 text-gray-500 max-w-[120px] truncate"
                    title={v.referrer || undefined}
                  >
                    {formatReferrerLabel(v.referrer) || '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-500 max-w-[72px] truncate" title={v.utm_source || undefined}>
                    {v.utm_source || '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-500 max-w-[72px] truncate" title={v.utm_medium || undefined}>
                    {v.utm_medium || '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">{v.country || '—'}</td>
                  <td className="px-3 py-3 text-gray-500">{v.page_view_count}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDuration(v.duration_seconds)}</td>
                  <td className="px-3 py-3 text-gray-500 capitalize">{v.device_type || '—'}</td>
                </tr>
              ))}
              {visitors.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-gray-400">No visitor sessions in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setVisitorPage(p => Math.max(1, p - 1))} disabled={visitorPage === 1} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-[13px] text-gray-500">Page {visitorPage} · {visitorTotal} total</span>
          <button onClick={() => setVisitorPage(p => p + 1)} disabled={visitors.length < 20} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

// ── Submissions Tab ───────────────────────────────────────────────────────────
const SubmissionsTab = () => {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const params = { page, per_page: 30 };
    if (filter) params.status = filter;
    api.admin.getSubmissions(params).then(r => setSubs(r.data || [])).catch(() => {});
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const statusColor = s => s === 'graded' ? 'green' : s === 'failed' ? 'red' : s === 'grading' ? 'yellow' : 'gray';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'graded', 'grading', 'failed'].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-4 h-[34px] rounded-[8px] text-[12px] font-bold border transition-all ${filter === s ? 'bg-[#2C3E50] text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 border border-gray-200 rounded-[8px] hover:bg-gray-50"><RefreshCw size={16} className="text-gray-400" /></button>
      </div>
      <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
        <table className="w-full text-[13px] min-w-[600px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>{['ID', 'User', 'Type', 'Words', 'Band', 'Status', 'Date'].map(h => <th key={h} className="px-5 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subs.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-400 font-mono text-[11px]">{s.id.slice(0, 8)}</td>
                <td className="px-5 py-3 text-gray-500 font-mono text-[11px]">{(s.user_id || '').slice(0, 8)}</td>
                <td className="px-5 py-3 text-[#101828] font-medium">{s.exam_type} {s.task_type}</td>
                <td className="px-5 py-3 text-gray-500">{s.word_count || '—'}</td>
                <td className="px-5 py-3 font-bold text-[#101828]">{s.overall_band ?? '—'}</td>
                <td className="px-5 py-3"><Pill label={s.status} color={statusColor(s.status)} /></td>
                <td className="px-5 py-3 text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {subs.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No submissions.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="text-[13px] text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={subs.length < 30} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

// ── Discounts Tab ─────────────────────────────────────────────────────────────
const EMPTY_CODE = { code: '', description: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' };

const DiscountsTab = () => {
  const [codes, setCodes]     = useState([]);
  const [form, setForm]       = useState(null); // null = hidden, EMPTY_CODE = new
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => api.admin.getDiscounts().then(r => setCodes(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true); setError('');
    const res = await api.admin.createDiscount({
      code: form.code,
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      expires_at: form.expires_at || undefined,
    }).catch(e => ({ error: e.message }));
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    setForm(null); load();
  };

  const toggle = async (id, current) => {
    await api.admin.updateDiscount(id, { is_active: !current }).catch(() => {});
    load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this discount code?')) return;
    await api.admin.deleteDiscount(id).catch(() => {});
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-[15px] font-bold text-[#101828]">Discount Codes</h3>
        <button onClick={() => { setForm(EMPTY_CODE); setError(''); }} className="flex items-center gap-2 px-4 h-[36px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939]">
          <Plus size={15} /> New Code
        </button>
      </div>

      <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
        <table className="w-full text-[13px] min-w-[600px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>{['Code', 'Type', 'Value', 'Uses', 'Expires', 'Status', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {codes.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 font-bold text-[#101828] tracking-wide">{c.code}</td>
                <td className="px-5 py-3 text-gray-500 capitalize">{c.discount_type}</td>
                <td className="px-5 py-3 font-bold text-[#101828]">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                <td className="px-5 py-3 text-gray-500">{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                <td className="px-5 py-3 text-gray-400">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3"><Pill label={c.is_active ? 'Active' : 'Disabled'} color={c.is_active ? 'green' : 'gray'} /></td>
                <td className="px-5 py-3 flex items-center gap-3">
                  <button onClick={() => toggle(c.id, c.is_active)} title={c.is_active ? 'Disable' : 'Enable'}>
                    {c.is_active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-gray-300" />}
                  </button>
                  <button onClick={() => del(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No discount codes yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {form && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative bg-white rounded-[20px] w-[420px] p-7 shadow-2xl space-y-4">
            <h3 className="text-[16px] font-bold text-[#101828]">Create Discount Code</h3>
            {error && <p className="text-[12px] text-red-500 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>}
            {[
              { label: 'Code (e.g. LAUNCH50)', key: 'code', type: 'text', placeholder: 'LAUNCH50' },
              { label: 'Description (optional)', key: 'description', type: 'text', placeholder: 'Launch discount' },
              { label: 'Value', key: 'discount_value', type: 'number', placeholder: '20' },
              { label: 'Max Uses (leave blank = unlimited)', key: 'max_uses', type: 'number', placeholder: '' },
              { label: 'Expires At (optional)', key: 'expires_at', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[12px] font-bold text-gray-500 block mb-1">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400" />
              </div>
            ))}
            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Type</label>
              <select value={form.discount_type} onChange={e => setForm(x => ({ ...x, discount_type: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setForm(null)} className="flex-1 h-[40px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
              <button onClick={submit} disabled={saving || !form.code || !form.discount_value} className="flex-1 h-[40px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50">{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Support Tab ───────────────────────────────────────────────────────────────
const SupportTab = () => {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter]   = useState('open');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes]       = useState('');

  const load = useCallback(() => {
    const params = filter ? { status: filter } : {};
    api.admin.getSupport(params).then(r => setTickets(r.data || [])).catch(() => {});
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const update = async (id, status) => {
    await api.admin.updateSupport(id, { status, admin_notes: notes }).catch(() => {});
    setSelected(null); load();
  };

  const statusIcon = s =>
    s === 'resolved'   ? <CheckCircle size={16} className="text-emerald-500" /> :
    s === 'in_progress'? <Clock size={16} className="text-yellow-500" /> :
                         <AlertCircle size={16} className="text-red-500" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['open', 'in_progress', 'resolved', ''].map(s => (
          <button key={s} onClick={() => { setFilter(s); }} className={`px-4 h-[34px] rounded-[8px] text-[12px] font-bold border transition-all ${filter === s ? 'bg-[#2C3E50] text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 border border-gray-200 rounded-[8px] hover:bg-gray-50"><RefreshCw size={16} className="text-gray-400" /></button>
      </div>
      <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
        <table className="w-full text-[13px] min-w-[600px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>{['Status', 'Topic', 'Email', 'Date', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">{statusIcon(t.status)}</td>
                <td className="px-5 py-3 font-medium text-[#101828]">{t.topic}</td>
                <td className="px-5 py-3 text-gray-400">{t.email}</td>
                <td className="px-5 py-3 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <button onClick={() => { setSelected(t); setNotes(t.admin_notes || ''); }} className="text-[12px] font-bold text-blue-600 hover:underline">View</button>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No tickets.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-[20px] w-[480px] p-7 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-[16px] font-bold text-[#101828]">{selected.topic}</h3>
            <p className="text-[13px] text-gray-500">{selected.email} · {new Date(selected.created_at).toLocaleString()}</p>
            <div className="bg-gray-50 rounded-[12px] p-4 text-[13px] text-[#101828] leading-relaxed">{selected.message}</div>
            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Admin Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[13px] outline-none focus:border-blue-400 resize-none" placeholder="Internal notes…" />
            </div>
            <div className="flex gap-2 flex-wrap pt-2">
              <button onClick={() => setSelected(null)} className="flex-1 h-[38px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Close</button>
              <button onClick={() => update(selected.id, 'in_progress')} className="flex-1 h-[38px] bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-[10px] text-[13px] font-bold">In Progress</button>
              <button onClick={() => update(selected.id, 'resolved')} className="flex-1 h-[38px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[10px] text-[13px] font-bold">Resolve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
const EXAM_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'Academic|Task 1', label: 'Academic · Task 1' },
  { id: 'Academic|Task 2', label: 'Academic · Task 2' },
  { id: 'General|Task 1', label: 'General · Task 1' },
  { id: 'General|Task 2', label: 'General · Task 2' },
];

const SUMMARY_COMBOS = [
  { key: 'Academic|Task 1', label: 'Academic · Task 1' },
  { key: 'Academic|Task 2', label: 'Academic · Task 2' },
  { key: 'General|Task 1', label: 'General · Task 1' },
  { key: 'General|Task 2', label: 'General · Task 2' },
];

const TASK_CATEGORY_OPTIONS = EXAM_FILTERS.filter(f => f.id !== 'all');

const CHART_TYPE_OPTIONS = [
  'Bar chart',
  'Line graph',
  'Pie chart',
  'Table',
  'Mixed chart',
  'Grouped bar chart',
  'Two pie charts',
  'Map',
  'Process diagram',
];

const LETTER_TYPE_OPTIONS = ['Formal', 'Semi-formal', 'Informal'];

const TASK2_TOPIC_OPTIONS = [
  'Education',
  'Technology',
  'Environment',
  'Health',
  'Society',
  'Work',
  'Crime',
  'Government',
  'Media',
  'Transport',
  'Culture',
  'Globalization',
  'Other',
];

/** Matches question-bank title suffixes; dedupe adds " (2)", " (3)", etc. */
const TASK2_QUESTION_TYPE_OPTIONS = [
  'Opinion',
  'Discussion',
  'Problem & Solution',
  'Advantages & Disadvantages',
  'Double Question',
  'Other',
];

function stripTitleDedupeSuffix(text) {
  return (text || '').replace(/\s\(\d+\)$/, '').trim();
}

function parseTask2Title(title) {
  if (!title?.includes(' — ')) return { topic: '', type: '' };
  const [topic, ...rest] = title.split(' — ');
  return {
    topic: stripTitleDedupeSuffix(topic),
    type: stripTitleDedupeSuffix(rest.join(' — ')),
  };
}

const CHART_SOURCE_OPTIONS = [
  { value: 'svg', label: 'SVG markup' },
  { value: 'image', label: 'Image upload' },
];

const TASK_SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'usage:desc', label: 'Most used' },
  { value: 'usage:asc', label: 'Least used' },
  { value: 'skips:desc', label: 'Most skipped' },
  { value: 'skips:asc', label: 'Least skipped' },
  { value: 'avg_score:desc', label: 'Highest avg score' },
  { value: 'avg_score:asc', label: 'Lowest avg score' },
];

function formPreset(exam_type, task_type) {
  return { ...EMPTY_TASK, exam_type, task_type };
}

const EMPTY_TASK = {
  exam_type: 'Academic',
  task_type: 'Task 2',
  question_text: '',
  prompt: '',
  chart_svg: '',
  chart_image: '',
  chart_source: 'svg',
  chart_type: 'Bar chart',
  letter_type: 'Formal',
  bullet_points: ['', '', ''],
  topic: '',
  type: '',
};

function detectJsonFormat(item) {
  if (!item || typeof item !== 'object') return null;
  if (item.prompt && item['chart-type']) return { exam_type: 'Academic', task_type: 'Task 1', format: 'report' };
  if (item.prompt && (item['letter-type'] || item['bullet-points'])) return { exam_type: 'General', task_type: 'Task 1', format: 'letter' };
  if (item.question) return { exam_type: 'Academic', task_type: 'Task 2', format: 'task2' };
  if (item.exam_type && item.task_type) return { exam_type: item.exam_type, task_type: item.task_type, format: 'internal' };
  return null;
}

function taskToForm(t) {
  if (!t) return { ...EMPTY_TASK };
  const base = {
    ...t,
    prompt: t.question_text || '',
    chart_svg: t.chart_svg || '',
    chart_type: 'Bar chart',
    letter_type: 'Formal',
    bullet_points: ['', '', ''],
    topic: '',
    type: '',
  };
  if (t.exam_type === 'General' && t.task_type === 'Task 1') {
    const m = t.title?.match(/^Letter \(([^)]+)\)/);
    if (m) base.letter_type = m[1];
    const bulletMatch = t.question_text?.match(/In your letter:\n([\s\S]*)/);
    if (bulletMatch) {
      base.bullet_points = bulletMatch[1]
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 5);
      while (base.bullet_points.length < 3) base.bullet_points.push('');
      base.prompt = t.question_text.split('\n\nIn your letter:')[0].trim();
    }
  }
  if (t.task_type === 'Task 2' && t.title?.includes(' — ')) {
    const { topic, type } = parseTask2Title(t.title);
    base.topic = topic;
    base.type = type;
    base.question_text = (t.question_text || '').replace(/\n\nWrite at least 250 words\.?\s*$/i, '').trim();
  }
  if (t.exam_type === 'Academic' && t.task_type === 'Task 1') {
    const ct = t.title?.split(' — ')[0];
    if (ct) base.chart_type = ct;
    base.prompt = (t.question_text || '')
      .replace(/\n\nSummarise the information[\s\S]*$/i, '')
      .replace(/\s*\[chart image provided\]\s*/gi, ' ')
      .trim();
    base.chart_image = t.chart_image || '';
    base.chart_source = t.chart_image && !t.chart_svg ? 'image' : 'svg';
  }
  return base;
}

const TasksTab = () => {
  const [tasks, setTasks]       = useState([]);
  const [summary, setSummary]   = useState({});
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [perPage]               = useState(50);
  const [form, setForm]         = useState(null);
  const [isNew, setIsNew]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [history, setHistory]   = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [examFilter, setExamFilter]     = useState('all');
  const [sortBy, setSortBy]             = useState('created_at');
  const [sortOrder, setSortOrder]       = useState('desc');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importExamType, setImportExamType] = useState('Academic');
  const [importTaskType, setImportTaskType] = useState('Task 2');
  const [importFormat, setImportFormat] = useState(null);
  const [importAutoDetected, setImportAutoDetected] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const chartImageInputRef = useRef(null);
  const promptExtractRef = useRef(null);
  const [previewTask, setPreviewTask] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);
  const [extractingPrompt, setExtractingPrompt] = useState(false);

  const load = useCallback(() => {
    const params = {
      page,
      per_page: perPage,
      status: statusFilter,
      sort: sortBy,
      order: sortOrder,
    };
    if (examFilter !== 'all') {
      const [exam_type, task_type] = examFilter.split('|');
      params.exam_type = exam_type;
      params.task_type = task_type;
    }
    api.admin.getTasks(params).then(r => {
      setTasks(r.data || []);
      setSummary(r.summary || {});
      setTotal(r.total || 0);
    }).catch(() => {});
  }, [page, perPage, statusFilter, examFilter, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const openCreate = () => { setForm({ ...EMPTY_TASK }); setIsNew(true); setError(''); };
  const openEdit = async (t) => {
    setError('');
    setIsNew(false);
    try {
      const full = await api.admin.getTask(t.id);
      if (full?.error) throw new Error(full.error);
      setForm(taskToForm(full?.id ? full : t));
    } catch {
      setForm(taskToForm(t));
    }
  };
  const closeForm  = () => { setForm(null); setError(''); };

  const buildSavePayload = () => {
    const f = form;
    const payload = {
      exam_type: f.exam_type,
      task_type: f.task_type,
    };
    if (f.exam_type === 'Academic' && f.task_type === 'Task 1') {
      payload.prompt = f.prompt?.trim();
      payload.chart_type = f.chart_type?.trim() || 'Chart';
      payload.chart_source = f.chart_source || 'svg';
      if (f.chart_source === 'image') {
        payload.chart_image = f.chart_image || undefined;
        payload.chart_svg = '';
      } else {
        payload.chart_svg = f.chart_svg?.trim() || undefined;
        payload.chart_image = '';
      }
    } else if (f.exam_type === 'General' && f.task_type === 'Task 1') {
      payload.prompt = f.prompt?.trim();
      payload.letter_type = f.letter_type || 'Formal';
      payload.bullet_points = (f.bullet_points || []).map(b => b.trim()).filter(Boolean);
    } else {
      payload.question_text = f.question_text?.trim();
      payload.topic = f.topic?.trim();
      payload.type = f.type?.trim();
    }
    return payload;
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = buildSavePayload();
      if (isNew) {
        const res = await api.admin.createTask(payload);
        if (res?.error) throw new Error(res.error);
      } else {
        const res = await api.admin.updateTask(form.id, payload);
        if (res?.error) throw new Error(res.error);
      }
      closeForm();
      load();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    await api.admin.updateTask(t.id, { is_active: !t.is_active }).catch(() => {});
    load();
  };

  const openPreview = async (t) => {
    setPreviewLoading(true);
    setPreviewTask({ loading: true, title: t.title, exam_type: t.exam_type, task_type: t.task_type });
    try {
      const full = await api.admin.getTask(t.id);
      if (full?.error) throw new Error(full.error);
      setPreviewTask(full);
    } catch (e) {
      setPreviewTask({ error: e.message || 'Could not load task.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const res = await api.admin.deleteTask(deletingTask.id).catch(e => ({ error: e.message }));
    setDeletingTask(null);
    if (res?.error) {
      setError(res.error);
    } else {
      load();
    }
  };

  const handlePromptExtract = async (file) => {
    if (!file) return;
    setExtractingPrompt(true);
    setError('');
    try {
      const text = await extractFileText(file);
      setForm(x => ({ ...x, prompt: text.trim() }));
    } catch (e) {
      setError(e.message || 'Could not extract text from file.');
    } finally {
      setExtractingPrompt(false);
    }
  };

  const handleChartImageSelect = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await readAsDataURL(file);
      setForm(x => ({ ...x, chart_image: dataUrl, chart_source: 'image' }));
    } catch (e) {
      setError(e.message || 'Could not read chart image.');
    }
  };

  const previewQuestionText = useMemo(
    () => (form ? buildPreviewQuestionText(form) : ''),
    [form],
  );

  const previewChartType = useMemo(() => {
    if (!form || form.exam_type !== 'Academic' || form.task_type !== 'Task 1') return null;
    return form.chart_type || 'Chart';
  }, [form]);

  const chartTypeOptions = useMemo(() => {
    const fromBank = tasks
      .filter(t => t.exam_type === 'Academic' && t.task_type === 'Task 1')
      .map(t => t.title?.split(' — ')[0])
      .filter(Boolean);
    return [...new Set([...CHART_TYPE_OPTIONS, ...fromBank])];
  }, [tasks]);

  const task2TopicOptions = useMemo(() => {
    const fromBank = tasks
      .filter(t => t.task_type === 'Task 2' && t.title?.includes(' — '))
      .map(t => parseTask2Title(t.title).topic)
      .filter(Boolean);
    return [...new Set([...TASK2_TOPIC_OPTIONS.filter(o => o !== 'Other'), ...fromBank, 'Other'])];
  }, [tasks]);

  const task2TypeOptions = TASK2_QUESTION_TYPE_OPTIONS;

  const taskCategoryValue = form ? `${form.exam_type}|${form.task_type}` : 'Academic|Task 2';

  const showHistory = async (t) => {
    const res = await api.admin.getTaskHistory(t.id).catch(() => ({ data: [] }));
    setHistory({ task: t, entries: res.data || [] });
  };

  const handleImportFileChange = async (file) => {
    setImportFile(file);
    setImportResult(null);
    setImportFormat(null);
    setImportAutoDetected(false);
    if (!file || !file.name.toLowerCase().endsWith('.json')) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      if (items[0]) {
        const detected = detectJsonFormat(items[0]);
        if (detected) {
          setImportExamType(detected.exam_type);
          setImportTaskType(detected.task_type);
          setImportFormat(detected.format);
          setImportAutoDetected(true);
        }
      }
    } catch {
      // ignore — import endpoint will validate
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', importFile);
    fd.append('exam_type', importExamType);
    fd.append('task_type', importTaskType);
    const result = await api.admin.importTasks(fd).catch(e => ({ error: e.message }));
    setImporting(false);
    setImportResult(result);
    if (result?.imported > 0) {
      setImportFile(null);
      setImportFormat(null);
      setImportAutoDetected(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    }
  };

  const typeColor = (taskType) => taskType === 'Task 1' ? 'blue' : 'green';

  const formValid = () => {
    if (!form) return false;
    if (form.exam_type === 'Academic' && form.task_type === 'Task 1') {
      const hasPrompt = Boolean(form.prompt?.trim());
      const hasChart = form.chart_source === 'image'
        ? Boolean(form.chart_image)
        : Boolean(form.chart_svg?.trim());
      return hasPrompt && hasChart;
    }
    if (form.exam_type === 'General' && form.task_type === 'Task 1') {
      return Boolean(form.prompt?.trim());
    }
    return Boolean(form.question_text?.trim());
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — filters left, actions right */}
      <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Exam type</label>
            <select
              value={examFilter}
              onChange={e => { setExamFilter(e.target.value); setPage(1); }}
              className="w-full h-[36px] border border-gray-200 rounded-[8px] px-3 text-[12px] font-semibold text-gray-700 outline-none focus:border-blue-400 bg-white"
            >
              {EXAM_FILTERS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full h-[36px] border border-gray-200 rounded-[8px] px-3 text-[12px] font-semibold text-gray-700 outline-none focus:border-blue-400 bg-white capitalize"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Sort</label>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={e => {
                const [sort, order] = e.target.value.split(':');
                setSortBy(sort);
                setSortOrder(order);
                setPage(1);
              }}
              className="w-full h-[36px] border border-gray-200 rounded-[8px] px-3 text-[12px] font-semibold text-gray-700 outline-none focus:border-blue-400 bg-white"
            >
              {TASK_SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button onClick={load} title="Refresh" className="h-[36px] w-[36px] border border-gray-200 rounded-[8px] hover:bg-gray-50 flex items-center justify-center shrink-0">
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0 lg:pl-6 lg:border-l lg:border-gray-100">
          <button onClick={() => { setShowImport(i => !i); setImportResult(null); }} className={`flex items-center justify-center gap-2 h-[36px] px-4 rounded-[8px] text-[12px] font-bold border transition-all whitespace-nowrap ${showImport ? 'bg-blue-600 text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Upload size={14} /> Import
          </button>
          <button onClick={openCreate} className="flex items-center justify-center gap-2 h-[36px] px-4 bg-[#2C3E50] text-white rounded-[8px] text-[12px] font-bold hover:bg-[#1D2939] whitespace-nowrap">
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* ── Import Panel ──────────────────────────────────────────────────────── */}
      {showImport && (
        <div className="bg-white rounded-[16px] border border-blue-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileJson size={18} className="text-blue-600" />
            <h3 className="text-[14px] font-bold text-[#101828]">Bulk Import Questions</h3>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            Upload a JSON question bank: <strong>ielts_task2.json</strong>, <strong>ielts_task1_report.json</strong>, or <strong>ielts_task1_letter.json</strong>.
            Exam and task type are auto-detected from the file format. PDF import is also supported (manual type required).
          </p>

          {importAutoDetected && importFormat && (
            <p className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-[8px] px-3 py-2">
              Detected format: <strong>{importFormat}</strong> → {importExamType} · {importTaskType}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wide">Exam Type</label>
              <select
                value={importExamType}
                onChange={e => { setImportExamType(e.target.value); setImportAutoDetected(false); }}
                disabled={importAutoDetected && importFormat !== 'task2'}
                className="w-full border border-gray-200 rounded-[10px] px-3 h-[38px] text-[13px] outline-none focus:border-blue-400 disabled:bg-gray-50"
              >
                <option value="Academic">Academic</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1 uppercase tracking-wide">Task Type</label>
              <select
                value={importTaskType}
                onChange={e => { setImportTaskType(e.target.value); setImportAutoDetected(false); }}
                disabled={importAutoDetected && importFormat !== 'task2'}
                className="w-full border border-gray-200 rounded-[10px] px-3 h-[38px] text-[13px] outline-none focus:border-blue-400 disabled:bg-gray-50"
              >
                <option value="Task 1">Task 1</option>
                <option value="Task 2">Task 2</option>
              </select>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-[12px] p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFileChange(f); }}
          >
            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
            {importFile ? (
              <p className="text-[13px] font-bold text-blue-700">{importFile.name} <span className="text-gray-400 font-normal">({(importFile.size / 1024).toFixed(1)} KB)</span></p>
            ) : (
              <p className="text-[13px] text-gray-400">Click or drag a <strong>.json</strong> or <strong>.pdf</strong> file here</p>
            )}
            <input ref={fileInputRef} type="file" accept=".json,.pdf,application/json,application/pdf" className="hidden" onChange={e => handleImportFileChange(e.target.files[0] || null)} />
          </div>

          {importResult && (
            <div className={`rounded-[10px] px-4 py-3 text-[13px] ${importResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
              {importResult.error || importResult.message}
              {importResult.skipped > 0 && <span className="ml-2 text-[12px] text-gray-500">({importResult.skipped} skipped)</span>}
              {importResult.errors?.length > 0 && (
                <ul className="mt-1 text-[11px] text-gray-500 list-disc list-inside">
                  {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); setImportAutoDetected(false); }} className="flex-1 h-[38px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
            <button onClick={handleImport} disabled={!importFile || importing} className="flex-1 h-[38px] bg-blue-600 text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50 hover:bg-blue-700">
              {importing ? 'Importing…' : 'Import Questions'}
            </button>
          </div>
        </div>
      )}

      {/* Analytics summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SUMMARY_COMBOS.map(combo => {
          const stats = summary[combo.key] || { active: 0, total: 0, submissions: 0 };
          return (
            <div key={combo.key} className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{combo.label}</p>
              <p className="text-[22px] font-black text-[#101828] leading-none">{stats.active}<span className="text-[12px] font-semibold text-gray-400 ml-1">active</span></p>
              <p className="text-[11px] text-gray-400 mt-0.5">{stats.submissions} total submissions</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              {['Type', 'Question', 'Created', 'Usage', 'Skips', 'Avg score', 'Status', 'Actions'].map(h => (
                <th key={h} className={`px-4 py-3 text-left ${h === 'Actions' ? 'whitespace-nowrap min-w-[280px]' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tasks.map(t => (
              <tr key={t.id} className={`group hover:bg-gray-50/50 ${!t.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <Pill label={t.exam_type} color="blue" />
                    <Pill label={t.task_type} color={typeColor(t.task_type)} />
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[320px]">
                  <span className="line-clamp-2 text-[12px] leading-relaxed">{t.question_text?.slice(0, 140)}{t.question_text?.length > 140 ? '…' : ''}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-[12px] whitespace-nowrap">{formatDate(t.created_at)}</td>
                <td className="px-4 py-3 text-gray-500 font-bold">{t.usage_count ?? 0}</td>
                <td className="px-4 py-3 text-gray-500 font-bold">{t.skip_count ?? 0}</td>
                <td className="px-4 py-3 text-gray-500 font-bold">{t.avg_score != null ? t.avg_score.toFixed(1) : '—'}</td>
                <td className="px-4 py-3">
                  <Pill label={t.is_active ? 'Active' : 'Disabled'} color={t.is_active ? 'green' : 'gray'} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                    <button
                      onClick={() => openPreview(t)}
                      title="Preview exam UI"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 shrink-0"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button onClick={() => openEdit(t)} className="inline-flex items-center px-2 py-1 rounded-[6px] text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 shrink-0">
                      Edit
                    </button>
                    <button onClick={() => showHistory(t)} title="View history" className="inline-flex items-center justify-center p-1 rounded-[6px] text-gray-500 hover:bg-gray-100 border border-gray-200 shrink-0">
                      <History size={14} />
                    </button>
                    <button onClick={() => toggleActive(t)} title={t.is_active ? 'Deactivate' : 'Activate'} className="shrink-0 p-0.5">
                      {t.is_active
                        ? <ToggleRight size={20} className="text-emerald-500" />
                        : <ToggleLeft size={20} className="text-gray-300" />}
                    </button>
                    <button
                      onClick={() => setDeletingTask(t)}
                      title="Permanently delete"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 shrink-0"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">No tasks found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[12px] text-gray-400">{total} task{total !== 1 ? 's' : ''} · page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {form && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-[20px] w-full max-w-[560px] p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[16px] font-bold text-[#101828]">{isNew ? 'Create Task' : 'Edit Task'}</h3>
            {!isNew && form.title && (
              <p className="text-[12px] text-gray-400">Title: <span className="text-gray-600 font-medium">{form.title}</span></p>
            )}
            {error && <p className="text-[12px] text-red-500 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>}

            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Task category</label>
              <select
                value={taskCategoryValue}
                onChange={e => {
                  const [exam_type, task_type] = e.target.value.split('|');
                  if (isNew) {
                    setForm(formPreset(exam_type, task_type));
                  } else {
                    setForm(x => ({ ...x, exam_type, task_type }));
                  }
                }}
                disabled={!isNew}
                className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400 disabled:bg-gray-50"
              >
                {TASK_CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Academic Task 1 — report */}
            {form.exam_type === 'Academic' && form.task_type === 'Task 1' && (
              <>
                <div>
                  <label className="text-[12px] font-bold text-gray-500 block mb-1">Chart type</label>
                  <select
                    value={chartTypeOptions.includes(form.chart_type) ? form.chart_type : 'Other'}
                    onChange={e => {
                      const v = e.target.value;
                      setForm(x => ({ ...x, chart_type: v === 'Other' ? '' : v }));
                    }}
                    className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400"
                  >
                    {chartTypeOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value="Other">Other (custom)</option>
                  </select>
                  {(!form.chart_type || !chartTypeOptions.includes(form.chart_type)) && (
                    <input
                      type="text"
                      placeholder="Custom chart type…"
                      value={form.chart_type || ''}
                      onChange={e => setForm(x => ({ ...x, chart_type: e.target.value }))}
                      className="w-full mt-2 border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400"
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-bold text-gray-500">Report prompt</label>
                    <button
                      type="button"
                      onClick={() => promptExtractRef.current?.click()}
                      disabled={extractingPrompt}
                      className="text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {extractingPrompt ? 'Extracting…' : 'Extract from file'}
                    </button>
                    <input ref={promptExtractRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { handlePromptExtract(e.target.files?.[0]); e.target.value = ''; }} />
                  </div>
                  <textarea rows={4} placeholder="The chart below shows…" value={form.prompt} onChange={e => setForm(x => ({ ...x, prompt: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[13px] outline-none focus:border-blue-400 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-gray-500 block mb-1">Chart source</label>
                  <select
                    value={form.chart_source || 'svg'}
                    onChange={e => setForm(x => ({ ...x, chart_source: e.target.value }))}
                    className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400 bg-white"
                  >
                    {CHART_SOURCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {form.chart_source === 'svg' ? (
                  <div>
                    <label className="text-[12px] font-bold text-gray-500 block mb-1">Chart SVG</label>
                    <textarea rows={5} placeholder="Paste SVG markup here…" value={form.chart_svg} onChange={e => setForm(x => ({ ...x, chart_svg: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[12px] font-mono outline-none focus:border-blue-400 resize-none" />
                    <p className="text-[11px] text-gray-400 mt-1">Summarise instruction and word count are added automatically.</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-[12px] font-bold text-gray-500 block mb-1">Chart image</label>
                    <input ref={chartImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { handleChartImageSelect(e.target.files?.[0]); e.target.value = ''; }} />
                    <button type="button" onClick={() => chartImageInputRef.current?.click()} className="flex items-center gap-2 w-full h-[40px] border border-dashed border-blue-300 bg-blue-50/40 rounded-[10px] px-4 text-[12px] font-semibold text-blue-700 hover:bg-blue-50">
                      <ImageIcon size={16} /> {form.chart_image ? 'Replace chart image' : 'Upload chart image (JPG/PNG)'}
                    </button>
                    {form.chart_image && (
                      <div className="mt-3 bg-[#F3F4F6] rounded-[12px] p-3">
                        <img src={form.chart_image} alt="Chart preview" className="max-w-full h-auto mx-auto block" />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* General Task 1 — letter */}
            {form.exam_type === 'General' && form.task_type === 'Task 1' && (
              <>
                <div>
                  <label className="text-[12px] font-bold text-gray-500 block mb-1">Letter type</label>
                  <select value={form.letter_type} onChange={e => setForm(x => ({ ...x, letter_type: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400">
                    {LETTER_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-gray-500 block mb-1">Scenario / prompt</label>
                  <textarea rows={4} placeholder="You recently… Write a letter to…" value={form.prompt} onChange={e => setForm(x => ({ ...x, prompt: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[13px] outline-none focus:border-blue-400 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-gray-500 block mb-1">Bullet points</label>
                  {(form.bullet_points || ['', '', '']).map((bp, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Bullet ${i + 1}`}
                      value={bp}
                      onChange={e => setForm(x => {
                        const bullets = [...(x.bullet_points || ['', '', ''])];
                        bullets[i] = e.target.value;
                        return { ...x, bullet_points: bullets };
                      })}
                      className="w-full border border-gray-200 rounded-[10px] px-4 h-[38px] text-[13px] outline-none focus:border-blue-400 mb-2"
                    />
                  ))}
                </div>
              </>
            )}

            {/* Task 2 */}
            {!(form.exam_type === 'Academic' && form.task_type === 'Task 1') && !(form.exam_type === 'General' && form.task_type === 'Task 1') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-bold text-gray-500 block mb-1">Topic</label>
                    <select
                      value={task2TopicOptions.includes(form.topic) ? form.topic : (form.topic ? 'Other' : TASK2_TOPIC_OPTIONS[0])}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(x => ({ ...x, topic: v === 'Other' ? '' : v }));
                      }}
                      className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400"
                    >
                      {task2TopicOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {(!form.topic || !task2TopicOptions.includes(form.topic)) && (
                      <input
                        type="text"
                        placeholder="Custom topic…"
                        value={form.topic || ''}
                        onChange={e => setForm(x => ({ ...x, topic: e.target.value }))}
                        className="w-full mt-2 border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-gray-500 block mb-1">Question type</label>
                    <select
                      value={task2TypeOptions.includes(form.type) ? form.type : (form.type ? 'Other' : TASK2_QUESTION_TYPE_OPTIONS[0])}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(x => ({ ...x, type: v === 'Other' ? '' : v }));
                      }}
                      className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400"
                    >
                      {task2TypeOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {(!form.type || !task2TypeOptions.includes(form.type)) && (
                      <input
                        type="text"
                        placeholder="Custom question type…"
                        value={form.type || ''}
                        onChange={e => setForm(x => ({ ...x, type: e.target.value }))}
                        className="w-full mt-2 border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-gray-500 block mb-1">Question</label>
                  <textarea rows={6} placeholder="Write the full essay prompt here…" value={form.question_text} onChange={e => setForm(x => ({ ...x, question_text: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[13px] outline-none focus:border-blue-400 resize-none leading-relaxed" />
                  <p className="text-[11px] text-gray-400 mt-1">Title and word-count footer are generated automatically (40 min limit).</p>
                </div>
              </>
            )}

            {/* Live exam preview */}
            {form && (
              <div className="border border-gray-100 rounded-[12px] overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Exam preview</p>
                </div>
                <div className="bg-[#F8FAFC] p-4">
                  <ExamQuestionPanel
                    examType={form.exam_type}
                    taskType={form.task_type}
                    questionText={previewQuestionText}
                    chartSvg={form.chart_source !== 'image' ? (form.chart_svg || null) : null}
                    chartImage={form.chart_source === 'image' ? (form.chart_image || null) : null}
                    chartType={previewChartType}
                    timeLimitSeconds={form.task_type === 'Task 1' ? 1200 : 2400}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={closeForm} className="flex-1 h-[40px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving || !formValid()} className="flex-1 h-[40px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {history && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistory(null)} />
          <div className="relative bg-white rounded-[20px] w-full max-w-[560px] p-7 shadow-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-[16px] font-bold text-[#101828] mb-1">Change History</h3>
            <p className="text-[12px] text-gray-400 mb-4">{history.task.title}</p>
            {history.entries.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">No changes recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {history.entries.map((e) => (
                  <div key={e.id} className="bg-gray-50 rounded-[12px] p-4 text-[12px]">
                    <p className="text-gray-400 mb-2">{new Date(e.created_at).toLocaleString()}</p>
                    {e.previous_title && (
                      <div className="mb-2">
                        <span className="font-bold text-gray-500">Previous title:</span>
                        <p className="text-[#101828] mt-0.5">{e.previous_title}</p>
                      </div>
                    )}
                    {e.previous_question_text && (
                      <div>
                        <span className="font-bold text-gray-500">Previous question:</span>
                        <p className="text-[#101828] mt-0.5 leading-relaxed">{e.previous_question_text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setHistory(null)} className="mt-4 w-full h-[38px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Close</button>
          </div>
        </div>
      )}

      {/* Exam UI Preview Modal */}
      {previewTask && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewTask(null)} />
          <div className="relative bg-white rounded-[20px] w-full max-w-[520px] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[16px] font-bold text-[#101828]">Exam preview</h3>
                {previewTask.title && (
                  <p className="text-[12px] text-gray-400 mt-0.5 truncate max-w-[360px]">{previewTask.title}</p>
                )}
              </div>
              <button onClick={() => setPreviewTask(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 bg-[#F8FAFC] flex-1">
              {previewLoading || previewTask.loading ? (
                <p className="text-[13px] text-gray-500 py-8 text-center">Loading preview…</p>
              ) : previewTask.error ? (
                <p className="text-[13px] text-red-500 py-8 text-center">{previewTask.error}</p>
              ) : (
                <ExamQuestionPanel
                  examType={previewTask.exam_type}
                  taskType={previewTask.task_type}
                  questionText={previewTask.question_text}
                  chartSvg={previewTask.chart_svg}
                  chartImage={previewTask.chart_image}
                  chartType={previewTask.title?.split(' — ')[0]}
                  timeLimitSeconds={previewTask.time_limit_seconds}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      {deletingTask && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingTask(null)} />
          <div className="relative bg-white rounded-[20px] w-full max-w-[420px] p-7 shadow-2xl">
            <h3 className="text-[16px] font-bold text-[#101828] mb-2">Delete task permanently?</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-1">
              <span className="font-semibold text-[#101828]">{deletingTask.title}</span> will be removed from the question bank. This cannot be undone.
            </p>
            {(deletingTask.usage_count ?? 0) > 0 && (
              <p className="text-[12px] text-amber-600 bg-amber-50 rounded-[8px] px-3 py-2 mt-3">
                {deletingTask.usage_count} submission{deletingTask.usage_count !== 1 ? 's' : ''} reference this task. They will keep their scores but lose the task link.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeletingTask(null)} className="flex-1 h-[40px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 h-[40px] bg-red-600 text-white rounded-[10px] text-[13px] font-bold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Assignments Tab ───────────────────────────────────────────────────────────
const AssignmentsTab = () => {
  const [assignments, setAssignments] = useState([]);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [filtered, setFiltered]       = useState([]);

  const load = useCallback(() => {
    api.admin.getTaskAssignments({ page, per_page: 50 }).then(r => {
      const data = r.data || [];
      setAssignments(data);
    }).catch(() => {});
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(assignments); return; }
    const q = search.toLowerCase();
    setFiltered(assignments.filter(a =>
      a.user_name?.toLowerCase().includes(q) ||
      a.user_email?.toLowerCase().includes(q) ||
      a.task_title?.toLowerCase().includes(q)
    ));
  }, [search, assignments]);

  const typeColor = tt => tt === 'Task 1' ? 'blue' : 'green';

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or question…"
            className="w-full pl-9 pr-4 h-[40px] border border-gray-200 rounded-[10px] text-[13px] outline-none focus:border-blue-400"
          />
        </div>
        <button onClick={load} className="p-2 border border-gray-200 rounded-[8px] hover:bg-gray-50"><RefreshCw size={16} className="text-gray-400" /></button>
        <span className="text-[12px] text-gray-400 ml-auto">{assignments.length} assignments</span>
      </div>

      <div className="bg-white rounded-[16px] border border-gray-100 overflow-x-auto shadow-sm">
        <table className="w-full text-[13px] min-w-[700px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              {['User', 'Email', 'Question Title', 'Type', 'Session', 'Assigned At'].map(h => (
                <th key={h} className="px-5 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-[#101828]">{a.user_name || '—'}</td>
                <td className="px-5 py-3 text-gray-400 text-[12px]">{a.user_email || '—'}</td>
                <td className="px-5 py-3 text-gray-600 max-w-[220px] truncate" title={a.task_title}>{a.task_title || '—'}</td>
                <td className="px-5 py-3">
                  {a.task_exam_type !== '—' && (
                    <div className="flex flex-col gap-0.5">
                      <Pill label={a.task_exam_type} color="blue" />
                      <Pill label={a.task_task_type} color={typeColor(a.task_task_type)} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Pill label={a.session_type} color={a.session_type === 'mock' ? 'yellow' : 'green'} />
                </td>
                <td className="px-5 py-3 text-gray-400 text-[12px]">{new Date(a.assigned_at).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No question assignments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="text-[13px] text-gray-500">Page {page}</span>
        <button onClick={() => { setPage(p => p + 1); }} disabled={assignments.length < 50} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabIcon = { Overview: BarChart2, Users, Acquisition: Globe, 'Social Ops': Share2, Submissions: FileText, Tasks: BookOpen, Assignments: ClipboardList, Discounts: Tag, Support: MessageSquare };

  const switchTab = (t) => { setTab(t); setSidebarOpen(false); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">

      {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-gray-100 z-20 flex items-center px-4 gap-3">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-[8px] hover:bg-gray-50 text-gray-600">
          <Menu size={20} />
        </button>
        <span className="text-[16px] font-extrabold text-[#1a1f36] uppercase tracking-tight">IELTSGRADER</span>
        <span className="ml-auto text-[12px] font-bold text-gray-400 uppercase tracking-wide">{tab}</span>
      </div>

      {/* ── Sidebar backdrop (mobile) ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div className={`fixed top-0 left-0 h-full w-[220px] bg-white border-r border-gray-100 flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <span className="text-[17px] font-extrabold text-[#1a1f36] uppercase tracking-tight leading-none">IELTSGRADER</span>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
          {/* Close button — mobile only */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-gray-400 hover:text-gray-600 mt-0.5">
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {TABS.map(t => {
            const Icon = tabIcon[t];
            return (
              <button key={t} onClick={() => switchTab(t)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-[13px] font-bold transition-all ${tab === t ? 'bg-[#101828] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Icon size={16} /> {t}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-[13px] font-bold text-gray-400 hover:bg-gray-50">
            <LogOut size={16} /> Back to App
          </button>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="md:ml-[220px] pt-[56px] md:pt-0 p-4 md:p-8 min-h-screen">
        {tab !== 'Overview' && <h1 className="text-[20px] md:text-[22px] font-black text-[#101828] mb-5 md:mb-6">{tab}</h1>}
        {tab === 'Overview'     && <AdminOverview onNavigateTab={switchTab} />}
        {tab === 'Users'        && <UsersTab />}
        {tab === 'Acquisition'  && <AcquisitionTab />}
        {tab === 'Social Ops'   && <SocialOpsTab />}
        {tab === 'Submissions'  && <SubmissionsTab />}
        {tab === 'Tasks'        && <TasksTab />}
        {tab === 'Assignments'  && <AssignmentsTab />}
        {tab === 'Discounts'    && <DiscountsTab />}
        {tab === 'Support'      && <SupportTab />}
      </div>
    </div>
  );
}
