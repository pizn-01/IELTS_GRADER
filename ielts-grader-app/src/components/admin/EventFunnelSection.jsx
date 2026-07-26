import React from 'react';

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

function formatEventLabel(name) {
  return EVENT_LABELS[name] || String(name || '').replace(/_/g, ' ');
}

/**
 * Simple Overview section: overall conversion + one row per event
 * (count + step conversion %). Free-trial credit depth shown separately.
 */
export default function EventFunnelSection({
  steps = [],
  freeTrialEngagement = null,
  periodShort = '7d',
  loading = false,
}) {
  const firstUnique = steps[0]?.unique ?? 0;
  const lastUnique = steps[steps.length - 1]?.unique ?? 0;
  const overallConversion =
    firstUnique === 0 ? 0 : Math.round((lastUnique / firstUnique) * 1000) / 10;

  const eng = freeTrialEngagement;
  const hasEngagement = eng && (eng.used_one_unique > 0 || eng.signup_unique > 0);

  return (
    <div className={`bg-white rounded-[12px] border border-gray-100 shadow-sm p-3.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Event funnel · {periodShort}
        </p>
        <p className="text-[10px] text-gray-400">Count · conversion from previous step</p>
      </div>

      <div className="rounded-[10px] bg-[#F8FAFC] border border-gray-100 px-3.5 py-2.5 flex items-center justify-between gap-3 mb-3">
        <span className="text-[12px] text-gray-500">Signup → payment</span>
        <span className="text-[16px] font-black text-[#101828] tabular-nums">{overallConversion}%</span>
      </div>

      {hasEngagement && (
        <div className="rounded-[10px] border border-gray-100 px-3.5 py-2.5 mb-3 space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Free trial engagement
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[8px] bg-[#F8FAFC] px-2.5 py-2">
              <p className="text-[10px] text-gray-400 leading-tight">Used ≥1 free credit</p>
              <p className="text-[15px] font-black text-[#101828] tabular-nums mt-0.5">
                {eng.used_one_unique ?? 0}
              </p>
              <p className="text-[10px] text-gray-400 tabular-nums">
                {eng.used_one_of_signup_pct ?? 0}% of signups
              </p>
            </div>
            <div className="rounded-[8px] bg-[#F8FAFC] px-2.5 py-2">
              <p className="text-[10px] text-gray-400 leading-tight">Used all 3 free credits</p>
              <p className="text-[15px] font-black text-[#101828] tabular-nums mt-0.5">
                {eng.used_all_unique ?? 0}
              </p>
              <p className="text-[10px] text-gray-400 tabular-nums">
                {eng.used_all_of_used_one_pct ?? 0}% of those who used ≥1
              </p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 tabular-nums">
            Only 1–2 credits: {eng.used_only_some_unique ?? 0}
            {' · '}
            {eng.used_only_some_of_used_one_pct ?? 0}% of engaged free users
          </p>
        </div>
      )}

      <div className="border border-gray-100 rounded-[10px] divide-y divide-gray-50">
        {steps.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-gray-400">No events in this period yet.</p>
        ) : (
          steps.map((step, index) => (
            <div
              key={step.event_name}
              className="flex items-center justify-between gap-3 px-3 py-1.5"
            >
              <span className="text-[12px] text-gray-500">
                {index === 0
                  ? formatEventLabel(step.event_name)
                  : `→ ${formatEventLabel(step.event_name)}`}
              </span>
              <div className="text-right shrink-0">
                <span className="text-[12px] font-bold text-[#101828] tabular-nums">
                  {step.count ?? 0}
                </span>
                {index > 0 && (
                  <p className="text-[10px] text-gray-400 tabular-nums leading-tight">
                    {step.conversion_from_prev ?? 0}% from prev
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
