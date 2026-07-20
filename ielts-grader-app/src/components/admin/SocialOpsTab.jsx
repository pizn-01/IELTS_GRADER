import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { getAuthToken } from '../../utils/authStorage';
import {
  RefreshCw,
  Play,
  Copy,
  CheckCircle,
  SkipForward,
  MessageCircle,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  X as CloseIcon,
} from 'lucide-react';

const BRIEF_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week plan' },
  { id: 'open', label: 'Open me' },
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'onboarding', label: 'Onboarding' },
];

const FILTERS = [
  { id: 'today', label: 'Today + overdue' },
  { id: 'pending', label: 'All pending' },
  { id: 'all', label: 'Everything' },
];

const weekdayShort = () =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function sortActions(actions) {
  return [...actions].sort((a, b) => {
    const af = a.status === 'awaiting_reply' || a.type === 'followup' ? 0 : 1;
    const bf = b.status === 'awaiting_reply' || b.type === 'followup' ? 0 : 1;
    if (af !== bf) return af - bf;
    const at = Number(a.tier || 9);
    const bt = Number(b.tier || 9);
    if (at !== bt) return at - bt;
    return String(a.id).localeCompare(String(b.id));
  });
}

function filterActions(actions, filter, today) {
  const todayIdx = dayOrder.indexOf(today);
  return actions.filter((a) => {
    const st = (a.status || '').toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'pending') return st === 'pending' || st === 'awaiting_reply';
    // today + overdue
    if (!(st === 'pending' || st === 'awaiting_reply')) return false;
    const d = a.day || '';
    if (d === today) return true;
    const di = dayOrder.indexOf(d);
    return di !== -1 && todayIdx !== -1 && di < todayIdx && st === 'pending';
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SocialOpsTab() {
  const [bundle, setBundle] = useState(null);
  const [briefKind, setBriefKind] = useState('today');
  const [brief, setBrief] = useState({ markdown: '', exists: false });
  const [filter, setFilter] = useState('today');
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [job, setJob] = useState({ status: 'idle' });
  const [setupOut, setSetupOut] = useState('');
  const [detail, setDetail] = useState(null);

  const today = bundle?.weekday || weekdayShort();

  const refresh = useCallback(async () => {
    setError('');
    try {
      const data = await api.admin.socialOps.getBundle();
      setBundle(data);
      setJob(data.job || { status: 'idle' });
      if (data.today_brief) setBrief(data.today_brief);
    } catch (err) {
      setError(err.message || 'Could not load Social Ops status');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBrief = useCallback(async (kind) => {
    try {
      const data = await api.admin.socialOps.getBrief(kind);
      setBrief(data);
    } catch (err) {
      setBrief({ markdown: err.message || 'Failed to load', exists: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (briefKind === 'today' && bundle?.today_brief) {
      setBrief(bundle.today_brief);
      return;
    }
    loadBrief(briefKind);
  }, [briefKind, loadBrief, bundle?.today_brief]);

  // Poll while job running
  useEffect(() => {
    if (job?.status !== 'running') return undefined;
    const t = setInterval(async () => {
      try {
        const j = await api.admin.socialOps.getJob();
        setJob(j);
        if (j.status !== 'running') {
          await refresh();
          if (briefKind) await loadBrief(briefKind);
          setToast(j.status === 'ok' ? 'Job finished — list refreshed.' : `Job ended: ${j.error || j.status}`);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [job?.status, refresh, briefKind, loadBrief]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const actions = useMemo(() => {
    const list = filterActions(bundle?.actions || [], filter, today);
    return sortActions(list);
  }, [bundle?.actions, filter, today]);

  const runAction = async (action, extra = {}) => {
    setBusy(action);
    setError('');
    try {
      const res = await api.admin.socialOps.run({
        action,
        dry_run: dryRun,
        ...extra,
      });
      setJob(res.job || { status: 'running' });
      setToast(
        dryRun
          ? 'Dry run started (no live API discovery / templates OK)…'
          : 'Started — this can take a few minutes. Keep this tab open.'
      );
    } catch (err) {
      setError(err.message || 'Run failed');
    } finally {
      setBusy('');
    }
  };

  const handleCopyNext = async () => {
    setBusy('copy');
    setError('');
    try {
      const data = await api.admin.socialOps.copyNext();
      if (data.empty) {
        setToast('Nothing pending. Run “Show today’s work” or refresh the week.');
        return;
      }
      const ok = await copyText(data.paste || '');
      setDetail(data);
      setToast(
        ok
          ? `Copied #${data.id}. Open the URL, paste, then mark done.`
          : `Could not access clipboard — paste shown below (#${data.id}).`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleMark = async (id, opts = {}) => {
    setBusy(`mark-${id}`);
    try {
      const data = await api.admin.socialOps.markDone(id, opts);
      setBundle(data);
      setDetail(null);
      setToast(`Marked #${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const openDetail = async (id) => {
    setBusy(`detail-${id}`);
    try {
      const data = await api.admin.socialOps.getAction(id);
      setDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleSetup = async () => {
    setBusy('setup');
    try {
      const data = await api.admin.socialOps.setupCheck();
      setSetupOut(data.output || '');
      setToast(data.ok ? 'Setup looks good.' : 'Setup has missing items — see panel.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const downloadSchedule = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(api.admin.socialOps.scheduleUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No schedule file yet');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schedule_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      setToast('Schedule CSV downloaded — import into Buffer/Later if you use one.');
    } catch (err) {
      setError(err.message);
    }
  };

  const kpi = bundle?.kpi;
  const running = job?.status === 'running';
  const keys = bundle?.keys || {};
  const missingKeys = ['SERPER_API_KEY', 'YOUTUBE_API_KEY', 'OPENAI_API_KEY'].filter(
    (k) => keys[k] === false
  );
  const needsColdStart = Boolean(bundle?.paths && !bundle.paths.has_onboarding);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-[14px] font-medium py-12">
        <Loader2 className="animate-spin" size={18} /> Loading Social Ops…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Help */}
      <div className="rounded-[12px] border border-blue-100 bg-blue-50/60 px-4 py-3 text-[13px] text-[#1a1f36] leading-relaxed">
        <p className="font-bold mb-1">How to use</p>
        <ol className="list-decimal ml-4 space-y-0.5 text-gray-700">
          <li>
            <strong>First time only:</strong> Setup check → fix any missing keys →{' '}
            <strong>Cold start</strong> (builds themes / onboarding — learn, don’t spam old threads)
          </li>
          <li>
            <strong>Every Monday:</strong> Start / refresh week → then work the list
          </li>
          <li>
            <strong>Tue–Fri:</strong> Show today’s work → Copy next → paste on the platform → Mark done
          </li>
          <li>
            <strong>Sunday:</strong> Sunday scorecard
          </li>
        </ol>
        <p className="mt-2 text-gray-600 text-[12px]">
          This never posts for you. Value first · disclose when you promote · no band guarantees.
        </p>
      </div>

      {needsColdStart && (
        <div className="rounded-[10px] border border-amber-200 bg-amber-50 text-amber-950 text-[13px] font-semibold px-4 py-2.5">
          No onboarding brief yet — run <strong>Cold start</strong> once before your first weekly pack
          (playbook: historical listening = learn from evergreen threads, not spam).
        </div>
      )}

      {missingKeys.length > 0 && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 text-red-800 text-[13px] px-4 py-3">
          <p className="font-bold mb-1">Missing API keys on the server</p>
          <p className="mb-2">
            {missingKeys.join(', ')}. Without Serper, Facebook/Instagram/Quora/X/LinkedIn/TikTok
            discovery fails.
          </p>
          <p className="text-[12px] font-mono bg-white/70 border border-red-100 rounded-[8px] px-2 py-1.5 break-all">
            cd backend && fly secrets set SERPER_API_KEY=… YOUTUBE_API_KEY=…
          </p>
        </div>
      )}

      {toast && (
        <div className="rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold px-4 py-2.5">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold px-4 py-2.5 flex gap-2 items-start">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI */}
      <div className="rounded-[12px] border border-gray-100 bg-white px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">This week</p>
          <p className="text-[15px] font-extrabold text-[#101828]">
            {kpi?.strip || 'No week pack yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-[8px] hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Run bar */}
      <div className="rounded-[12px] border border-gray-100 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-extrabold text-[#101828]">1) Prepare work</p>
          <label className="flex items-center gap-2 text-[12px] font-bold text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-gray-300"
            />
            Dry run (safe test)
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <RunBtn
            label="Setup check"
            hint="Do this first"
            icon={AlertCircle}
            busy={busy === 'setup'}
            onClick={handleSetup}
          />
          <RunBtn
            label="Cold start (once)"
            hint="First time — before weekly"
            icon={Play}
            busy={busy === 'cold_start' || running}
            onClick={() => runAction('cold_start')}
            primary={needsColdStart}
          />
          <RunBtn
            label="Start / refresh week"
            hint="Every Monday"
            icon={Play}
            busy={busy === 'weekly' || running}
            onClick={() => runAction('weekly')}
            primary={!needsColdStart}
          />
          <RunBtn
            label="Show today’s work"
            hint="Tue–Fri"
            icon={RefreshCw}
            busy={busy === 'daily' || running}
            onClick={() => runAction('daily')}
          />
          <RunBtn
            label="Copy next to clipboard"
            hint="Then paste & publish"
            icon={Copy}
            busy={busy === 'copy'}
            onClick={handleCopyNext}
          />
          <RunBtn
            label="Sunday scorecard"
            hint="Sunday"
            icon={CheckCircle}
            busy={busy === 'sunday' || running}
            onClick={() => runAction('sunday')}
          />
        </div>
        {(running || job?.log_tail) && (
          <div className="rounded-[8px] bg-gray-50 border border-gray-100 p-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">
              Job: {job?.action || '—'} · {job?.status || 'idle'}
              {running && <Loader2 className="inline ml-2 animate-spin" size={12} />}
            </p>
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
              {job?.log_tail || 'Starting…'}
            </pre>
          </div>
        )}
        {setupOut && (
          <pre className="text-[12px] bg-gray-50 border border-gray-100 rounded-[8px] p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {setupOut}
          </pre>
        )}
      </div>

      {/* Briefs */}
      <div className="rounded-[12px] border border-gray-100 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-extrabold text-[#101828]">2) Read your brief</p>
          <button
            type="button"
            onClick={downloadSchedule}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-600 hover:text-[#101828] px-3 py-1.5 rounded-[8px] border border-gray-200 hover:bg-gray-50"
          >
            <Download size={14} /> Schedule CSV
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BRIEF_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setBriefKind(t.id)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold ${
                briefKind === t.id
                  ? 'bg-[#101828] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <pre className="text-[12px] leading-relaxed text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-[10px] p-4 max-h-[320px] overflow-y-auto">
          {brief.exists === false && !brief.markdown
            ? 'Nothing here yet. Run “Start / refresh week” or “Show today’s work”.'
            : brief.markdown || '—'}
        </pre>
      </div>

      {/* Actions */}
      <div className="rounded-[12px] border border-gray-100 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-extrabold text-[#101828]">
            3) Do the list ({actions.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold ${
                  filter === f.id
                    ? 'bg-[#101828] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {actions.length === 0 ? (
          <p className="text-[13px] text-gray-500 py-6 text-center">
            No actions in this filter. Try “All pending” or refresh the week.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {actions.map((a) => (
              <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#101828] truncate">
                    <span className="text-gray-400 font-mono mr-1">#{a.id}</span>
                    {a.platform} · {a.type}
                    {a.day ? ` · ${a.day}` : ''}
                    {a.fresh === '1' ? ' · FRESH' : ''}
                    {a.type === 'followup' ? ' · FOLLOW-UP' : ''}
                  </p>
                  <p className="text-[12px] text-gray-500 truncate">{a.title}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <SmallBtn onClick={() => openDetail(a.id)} label="Open" />
                  <SmallBtn
                    onClick={async () => {
                      const d = await api.admin.socialOps.getAction(a.id);
                      const ok = await copyText(d.paste || '');
                      setDetail(d);
                      setToast(ok ? `Copied #${a.id}` : 'Clipboard blocked — see detail');
                    }}
                    label="Copy"
                    icon={Copy}
                  />
                  <SmallBtn
                    onClick={() => handleMark(a.id)}
                    label="Done"
                    icon={CheckCircle}
                    tone="green"
                  />
                  <SmallBtn
                    onClick={() => handleMark(a.id, { awaiting_reply: true })}
                    label="Wait reply"
                    icon={MessageCircle}
                  />
                  <SmallBtn
                    onClick={() => handleMark(a.id, { skip: true })}
                    label="Skip"
                    icon={SkipForward}
                    tone="muted"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[12px] text-gray-400 leading-relaxed pb-8">
        {bundle?.playbook_remember ||
          'Value first. Disclose when you promote. No guarantees.'}{' '}
        Full rules: SEO/social-media/EMPLOYEE_PLAYBOOK.pdf
      </p>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-extrabold text-[#101828]">
                  #{detail.id} · {detail.platform} · {detail.type}
                </p>
                <p className="text-[12px] text-gray-500">{detail.title}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <CloseIcon size={18} />
              </button>
            </div>
            {(detail.openUrl || detail.url) && (
              <a
                href={detail.openUrl || detail.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:underline"
              >
                <ExternalLink size={14} /> Open thread / page
              </a>
            )}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Paste this</p>
              <pre className="text-[13px] whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-[10px] p-3">
                {detail.paste || '—'}
              </pre>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-[8px] bg-[#101828] text-white"
                onClick={async () => {
                  const ok = await copyText(detail.paste || '');
                  setToast(ok ? 'Copied paste' : 'Clipboard blocked');
                }}
              >
                <Copy size={14} /> Copy paste
              </button>
            </div>
            {detail.followup && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">If they reply</p>
                <pre className="text-[12px] whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-[10px] p-3">
                  {detail.followup}
                </pre>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleMark(detail.id)}
                className="px-3 py-2 rounded-[8px] text-[12px] font-bold bg-emerald-600 text-white"
              >
                Mark done
              </button>
              <button
                type="button"
                onClick={() => handleMark(detail.id, { awaiting_reply: true })}
                className="px-3 py-2 rounded-[8px] text-[12px] font-bold border border-gray-200"
              >
                Wait for reply
              </button>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-3 py-2 rounded-[8px] text-[12px] font-bold text-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RunBtn({ label, hint, icon: Icon, onClick, busy, primary }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`text-left rounded-[10px] border px-3 py-3 transition-colors disabled:opacity-60 ${
        primary
          ? 'border-[#101828] bg-[#101828] text-white hover:bg-[#1a1f36]'
          : 'border-gray-200 bg-white hover:bg-gray-50 text-[#101828]'
      }`}
    >
      <span className="flex items-center gap-2 text-[13px] font-extrabold">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
        {label}
      </span>
      {hint && (
        <span className={`block text-[11px] mt-0.5 ${primary ? 'text-white/70' : 'text-gray-400'}`}>
          {hint}
        </span>
      )}
    </button>
  );
}

function SmallBtn({ label, onClick, icon: Icon, tone }) {
  const tones = {
    green: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    muted: 'text-gray-500 bg-gray-50 border-gray-200',
    default: 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50',
  };
  const cls = tones[tone] || tones.default;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border text-[11px] font-bold ${cls}`}
    >
      {Icon ? <Icon size={12} /> : null}
      {label}
    </button>
  );
}
