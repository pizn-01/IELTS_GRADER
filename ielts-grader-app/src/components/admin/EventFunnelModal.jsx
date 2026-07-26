import React, { useCallback, useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

const EVENT_LABELS = {
  signup: 'Signup',
  test_started: 'Test started',
  test_completed: 'Test completed',
  grading_completed: 'Grading completed',
  upgrade_cta_clicked: 'Upgrade CTA clicked',
  pricing_viewed: 'Pricing viewed',
  checkout_started: 'Checkout started',
  payment_completed: 'Payment completed',
};

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

function formatEventLabel(name) {
  return EVENT_LABELS[name] || String(name || '').replace(/_/g, ' ');
}

export default function EventFunnelModal({ open, onClose, initialDays = 7 }) {
  const [days, setDays] = useState(initialDays);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setDays(initialDays);
  }, [open, initialDays]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.getEventsFunnel({ days });
      setSteps(Array.isArray(res.steps) ? res.steps : []);
    } catch (err) {
      setError(err.message || 'Failed to load funnel.');
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (!open) return undefined;
    load();
    return undefined;
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const topUnique = Math.max(1, ...steps.map((s) => s.unique || 0));
  const firstUnique = steps[0]?.unique ?? 0;
  const lastUnique = steps[steps.length - 1]?.unique ?? 0;
  const overallConversion =
    firstUnique === 0 ? 0 : Math.round((lastUnique / firstUnique) * 1000) / 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="bg-white rounded-[14px] shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-funnel-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="event-funnel-title" className="text-[15px] font-extrabold text-[#101828]">
              Event funnel
            </h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Last {days} days · unique actors + conversion between steps
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <DateRangeBar days={days} setDays={setDays} />
            <button
              type="button"
              onClick={load}
              className="p-1.5 border border-gray-200 rounded-[6px] hover:bg-gray-50"
              aria-label="Refresh funnel"
            >
              <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rounded-[10px] bg-[#F8FAFC] border border-gray-100 px-3.5 py-2.5 flex items-center justify-between gap-3">
          <span className="text-[12px] text-gray-500">Signup → payment</span>
          <span className="text-[16px] font-black text-[#101828] tabular-nums">{overallConversion}%</span>
        </div>

        {error && <p className="text-[12px] text-red-600">{error}</p>}

        {loading && steps.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-[8px] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Event counts
              </p>
              <div className="border border-gray-100 rounded-[10px] divide-y divide-gray-50">
                {steps.map((step) => (
                  <div
                    key={step.event_name}
                    className="flex items-center justify-between gap-3 px-3 py-1.5"
                  >
                    <span className="text-[12px] text-gray-500">{formatEventLabel(step.event_name)}</span>
                    <span className="text-[12px] font-bold text-[#101828] tabular-nums">{step.count ?? 0}</span>
                  </div>
                ))}
                {steps.length === 0 && (
                  <p className="px-3 py-3 text-[12px] text-gray-400">No events in this period yet.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Conversion funnel
              </p>
              <div className={`space-y-1.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                {steps.map((step, index) => {
                  const widthPct = Math.max(8, Math.round(((step.unique || 0) / topUnique) * 100));
                  return (
                    <React.Fragment key={step.event_name}>
                      {index > 0 && (
                        <div className="flex justify-center py-0.5">
                          <span className="text-[10px] font-bold text-[#2C3E50] bg-[#EEF2F6] px-2 py-0.5 rounded-full tabular-nums">
                            {step.conversion_from_prev ?? 0}%
                          </span>
                        </div>
                      )}
                      <div
                        className="rounded-[8px] bg-[#2C3E50] text-white px-3 py-2 transition-all"
                        style={{ width: `${widthPct}%`, minWidth: '140px' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold truncate">
                            {formatEventLabel(step.event_name)}
                          </span>
                          <span className="text-[11px] font-black tabular-nums shrink-0">
                            {step.unique ?? 0}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/70 mt-0.5 tabular-nums">
                          {step.count ?? 0} events
                        </p>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
