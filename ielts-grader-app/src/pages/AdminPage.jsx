import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Users, BarChart2, FileText, MessageSquare, Tag, LogOut, RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Search, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle, AlertCircle, BookOpen, History, Eye } from 'lucide-react';

const TABS = ['Overview', 'Users', 'Submissions', 'Tasks', 'Discounts', 'Support'];

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

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.admin.getStats().then(setStats).catch(() => {}); }, []);

  if (!stats) return <p className="text-gray-400 text-[14px] p-8">Loading…</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Users"     value={stats.users?.total}         sub={`+${stats.users?.new_this_week} this week`} />
        <Stat label="Total Exams"     value={stats.submissions?.total}   sub={`${stats.submissions?.grading_rate}% graded`} />
        <Stat label="Failed Grading"  value={stats.submissions?.failed}  />
        <Stat label="Active Discounts" value={stats.discounts?.active}   />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Open Tickets"       value={stats.support?.open}       />
        <Stat label="In Progress"        value={stats.support?.in_progress}/>
        <Stat label="Resolved Tickets"   value={stats.support?.resolved}   />
      </div>
    </div>
  );
};

// ── Users Tab ─────────────────────────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [editing, setEditing] = useState(null); // { id, credits_remaining, target_band, is_admin }
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    api.admin.getUsers({ page, per_page: 20, search }).then(r => setUsers(r.data || [])).catch(() => {});
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

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
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email…" className="w-full pl-9 pr-4 h-[40px] border border-gray-200 rounded-[10px] text-[13px] outline-none focus:border-blue-400" />
        </div>
        <button onClick={load} className="p-2 border border-gray-200 rounded-[10px] hover:bg-gray-50"><RefreshCw size={16} className="text-gray-400" /></button>
      </div>

      <div className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              {['Name', 'Email', 'Credits', 'Target', 'Exams', 'Admin', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-[#101828]">{u.full_name || '—'}</td>
                <td className="px-5 py-3 text-gray-500">{u.email}</td>
                <td className="px-5 py-3 font-bold text-[#101828]">{u.credits_remaining}</td>
                <td className="px-5 py-3 text-gray-500">{u.target_band}</td>
                <td className="px-5 py-3 text-gray-500">{u.submission_count}</td>
                <td className="px-5 py-3">{u.is_admin ? <Pill label="Admin" color="blue" /> : <Pill label="User" color="gray" />}</td>
                <td className="px-5 py-3">
                  <button onClick={() => setEditing({ ...u })} className="text-[12px] font-bold text-blue-600 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="text-[13px] text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20} className="p-2 border border-gray-200 rounded-[8px] disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-[20px] w-[380px] p-7 shadow-2xl space-y-5">
            <h3 className="text-[16px] font-bold text-[#101828]">Edit — {editing.full_name || editing.email}</h3>
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
      <div className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
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

      <div className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
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
      <div className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
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
const EMPTY_TASK = { exam_type: 'Academic', task_type: 'Task 2', title: '', question_text: '', time_limit_seconds: '' };

const TasksTab = () => {
  const [tasks, setTasks]     = useState([]);
  const [form, setForm]       = useState(null);   // null=hidden, EMPTY_TASK=new, task=editing
  const [isNew, setIsNew]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [history, setHistory] = useState(null);   // { task, entries }
  const [filter, setFilter]   = useState('all');  // 'all' | 'active' | 'inactive'

  const load = useCallback(() => {
    api.admin.getTasks().then(r => setTasks(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t => {
    if (filter === 'active')   return t.is_active;
    if (filter === 'inactive') return !t.is_active;
    return true;
  });

  const openCreate = () => { setForm({ ...EMPTY_TASK }); setIsNew(true); setError(''); };
  const openEdit   = (t) => { setForm({ ...t }); setIsNew(false); setError(''); };
  const closeForm  = () => { setForm(null); setError(''); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        exam_type: form.exam_type,
        task_type: form.task_type,
        title: form.title.trim(),
        question_text: form.question_text.trim(),
        time_limit_seconds: form.time_limit_seconds ? parseInt(form.time_limit_seconds) : undefined,
      };
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

  const showHistory = async (t) => {
    const res = await api.admin.getTaskHistory(t.id).catch(() => ({ data: [] }));
    setHistory({ task: t, entries: res.data || [] });
  };

  const typeColor = (taskType) => taskType === 'Task 1' ? 'blue' : 'green';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {['all', 'active', 'inactive'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 h-[34px] rounded-[8px] text-[12px] font-bold border transition-all capitalize ${filter === f ? 'bg-[#2C3E50] text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
        <button onClick={load} className="p-2 border border-gray-200 rounded-[8px] hover:bg-gray-50"><RefreshCw size={16} className="text-gray-400" /></button>
        <button onClick={openCreate} className="ml-auto flex items-center gap-2 px-4 h-[36px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939]">
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* Analytics summary */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Academic-Task 1', 'Academic-Task 2', 'General-Task 1', 'General-Task 2'].map(combo => {
            const [exam, , num] = combo.split('-');
            const taskType = `Task ${num}`;
            const group = tasks.filter(t => t.exam_type === exam && t.task_type === taskType);
            const usage = group.reduce((s, t) => s + (t.usage_count || 0), 0);
            return (
              <div key={combo} className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{combo.replace('-', ' · ')}</p>
                <p className="text-[22px] font-black text-[#101828] leading-none">{group.filter(t => t.is_active).length}<span className="text-[12px] font-semibold text-gray-400 ml-1">active</span></p>
                <p className="text-[11px] text-gray-400 mt-0.5">{usage} total submissions</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>{['Type', 'Title', 'Question (preview)', 'Usage', 'Status', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(t => (
              <tr key={t.id} className={`hover:bg-gray-50/50 ${!t.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <Pill label={t.exam_type} color="blue" />
                    <Pill label={t.task_type} color={typeColor(t.task_type)} />
                  </div>
                </td>
                <td className="px-5 py-3 font-medium text-[#101828] max-w-[160px] truncate">{t.title}</td>
                <td className="px-5 py-3 text-gray-400 max-w-[260px]">
                  <span className="line-clamp-2 text-[12px]">{t.question_text?.slice(0, 100)}{t.question_text?.length > 100 ? '…' : ''}</span>
                </td>
                <td className="px-5 py-3 text-gray-500 font-bold">{t.usage_count ?? 0}</td>
                <td className="px-5 py-3">
                  <Pill label={t.is_active ? 'Active' : 'Disabled'} color={t.is_active ? 'green' : 'gray'} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(t)} className="text-[12px] font-bold text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => showHistory(t)} title="View history"><History size={14} className="text-gray-400 hover:text-gray-600" /></button>
                    <button onClick={() => toggleActive(t)} title={t.is_active ? 'Deactivate' : 'Activate'}>
                      {t.is_active
                        ? <ToggleRight size={22} className="text-emerald-500" />
                        : <ToggleLeft size={22} className="text-gray-300" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No tasks found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {form && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-[20px] w-full max-w-[560px] p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[16px] font-bold text-[#101828]">{isNew ? 'Create Task' : 'Edit Task'}</h3>
            {error && <p className="text-[12px] text-red-500 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-bold text-gray-500 block mb-1">Exam Type</label>
                <select value={form.exam_type} onChange={e => setForm(x => ({ ...x, exam_type: e.target.value }))} disabled={!isNew} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400 disabled:bg-gray-50">
                  <option value="Academic">Academic</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold text-gray-500 block mb-1">Task Type</label>
                <select value={form.task_type} onChange={e => setForm(x => ({ ...x, task_type: e.target.value, time_limit_seconds: e.target.value === 'Task 1' ? 1200 : 2400 }))} disabled={!isNew} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400 disabled:bg-gray-50">
                  <option value="Task 1">Task 1</option>
                  <option value="Task 2">Task 2</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Title</label>
              <input type="text" placeholder="e.g. Graph analysis — population growth" value={form.title} onChange={e => setForm(x => ({ ...x, title: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400" />
            </div>

            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Question / Prompt</label>
              <textarea rows={6} placeholder="Write the full question or essay prompt here…" value={form.question_text} onChange={e => setForm(x => ({ ...x, question_text: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-[13px] outline-none focus:border-blue-400 resize-none leading-relaxed" />
            </div>

            <div>
              <label className="text-[12px] font-bold text-gray-500 block mb-1">Time Limit (seconds)</label>
              <input type="number" placeholder={form.task_type === 'Task 1' ? '1200' : '2400'} value={form.time_limit_seconds} onChange={e => setForm(x => ({ ...x, time_limit_seconds: e.target.value }))} className="w-full border border-gray-200 rounded-[10px] px-4 h-[40px] text-[13px] outline-none focus:border-blue-400" />
              <p className="text-[11px] text-gray-400 mt-1">Task 1 = 1200s (20 min) · Task 2 = 2400s (40 min)</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeForm} className="flex-1 h-[40px] border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.question_text} className="flex-1 h-[40px] bg-[#2C3E50] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create' : 'Save Changes'}</button>
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
                {history.entries.map((e, i) => (
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
    </div>
  );
};

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate  = useNavigate();
  const [tab, setTab] = useState('Overview');

  const tabIcon = { Overview: BarChart2, Users, Submissions: FileText, Tasks: BookOpen, Discounts: Tag, Support: MessageSquare };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full w-[220px] bg-white border-r border-gray-100 flex flex-col z-10">
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">IELTS Grader</p>
          <p className="text-[18px] font-black text-[#101828] mt-0.5">Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(t => {
            const Icon = tabIcon[t];
            return (
              <button key={t} onClick={() => setTab(t)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-[13px] font-bold transition-all ${tab === t ? 'bg-[#101828] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
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

      {/* Content */}
      <div className="ml-[220px] p-8">
        <h1 className="text-[22px] font-black text-[#101828] mb-6">{tab}</h1>
        {tab === 'Overview'     && <OverviewTab />}
        {tab === 'Users'        && <UsersTab />}
        {tab === 'Submissions'  && <SubmissionsTab />}
        {tab === 'Tasks'        && <TasksTab />}
        {tab === 'Discounts'    && <DiscountsTab />}
        {tab === 'Support'      && <SupportTab />}
      </div>
    </div>
  );
}
