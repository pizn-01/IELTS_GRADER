import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        active ? 'bg-[#ECFDF5] text-[#027A48]' : 'bg-[#F2F4F7] text-[#475467]'
      }`}
    >
      {active ? 'Active' : 'Free trial'}
    </span>
  );
}

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSubscriptionStatus()
      .then((data) => {
        setStatus(data);
        updateUser({
          credits_remaining: data.credits_remaining,
          credits_allowance: data.credits_allowance,
          subscription_plan: data.subscription_plan,
          subscription_status: data.subscription_status,
          is_subscribed: data.is_subscribed,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [updateUser]);

  const openBillingPortal = async (flow, setLoader) => {
    setLoader(true);
    setError('');
    try {
      const { url } = await api.createBillingPortalSession(
        flow === 'subscription_update' ? { flow: 'subscription_update' } : {}
      );
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to open billing portal.');
      setLoader(false);
    }
  };

  const remaining = status?.credits_remaining ?? user?.credits_remaining ?? 0;
  const allowance = status?.credits_allowance ?? user?.credits_allowance ?? 1;
  const isSubscribed = status?.is_subscribed;
  const currentPlan = status?.subscription_plan;
  const isWeekly = isSubscribed && currentPlan === 'weekly';

  const barPct = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0;
  const isLow = remaining > 0 && remaining <= Math.max(2, Math.floor(allowance * 0.15));
  const isExhausted = remaining === 0;

  const barColor = isExhausted ? 'bg-[#F04438]' : isLow ? 'bg-[#F59E0B]' : 'bg-[#12B76A]';
  const pctColor = isExhausted ? 'text-[#F04438]' : isLow ? 'text-[#F59E0B]' : 'text-[#12B76A]';

  const planLabel = isSubscribed ? (status?.plan_name || 'Subscription') : 'Free Trial';
  const renewalLabel = isSubscribed ? formatDate(status?.subscription_period_end) : '—';
  const billingLabel = isSubscribed
    ? (status?.billing_label || '—')
    : '1 free evaluation included';

  const statusMessage = (() => {
    if (isSubscribed && isExhausted) {
      return 'All evaluations used this period — credits reset on renewal.';
    }
    if (!isSubscribed && isExhausted) {
      return 'You have used your free evaluation. Subscribe to keep practicing.';
    }
    if (!isSubscribed && remaining > 0) {
      return `${remaining} free evaluation remaining — no card required until you subscribe.`;
    }
    if (isLow) {
      return `Only ${remaining} credit${remaining === 1 ? '' : 's'} left this period.`;
    }
    return isSubscribed
      ? `${allowance} evaluations included each billing period.`
      : 'Subscribe for 20/week or 100/month after your free trial.';
  })();

  const statusTone = isExhausted && !isSubscribed ? 'amber' : isExhausted ? 'neutral' : isLow ? 'amber' : 'neutral';

  return (
    <div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 py-8 sm:py-10 text-[#101828]">
      <header className="mb-5">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#101828]">Your Subscription</h1>
        <p className="text-[14px] text-[#667085] mt-1">
          Plan, usage, and billing in one place.
        </p>
      </header>

      {error && (
        <div className="mb-4 text-[13px] font-medium text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#D0D5DD] rounded-2xl p-6 shadow-sm">
          <p className="text-[14px] text-[#98A2B3]">Loading subscription details…</p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-[#D0D5DD] shadow-sm overflow-hidden">
          {/* Plan summary */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#F2F4F7]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[18px] font-bold text-[#101828]">{planLabel}</h2>
                <StatusBadge active={isSubscribed} />
              </div>
              {isSubscribed ? (
                <p className="text-[13px] text-[#667085] mt-1">
                  Next renewal · {renewalLabel}
                </p>
              ) : (
                <p className="text-[13px] text-[#667085] mt-1">{billingLabel}</p>
              )}
            </div>
            <p className="text-[20px] font-bold text-[#101828]">
              {isSubscribed ? billingLabel : 'Free'}
            </p>
          </div>

          {/* Usage */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#F2F4F7]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-bold text-[#101828]">
                {remaining} / {allowance} credits
              </p>
              <span className={`text-[13px] font-bold ${pctColor}`}>
                {isExhausted ? 'All used' : `${barPct}%`}
              </span>
            </div>
            <div className="h-2 bg-[#F2F4F7] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div
              className={`mt-3 rounded-lg px-3 py-2 flex gap-2 ${
                statusTone === 'amber'
                  ? 'bg-[#FFFBEB] border border-[#FEF3C7]'
                  : 'bg-[#F9FAFB] border border-[#F2F4F7]'
              }`}
            >
              {statusTone === 'amber' ? (
                <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              ) : isSubscribed ? (
                <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#1A96F3] shrink-0 mt-0.5" />
              )}
              <p
                className={`text-[13px] font-medium leading-snug ${
                  statusTone === 'amber' ? 'text-[#92400E]' : 'text-[#475467]'
                }`}
              >
                {statusMessage}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#F2F4F7] grid sm:grid-cols-2 gap-5 sm:gap-6">
            {isSubscribed ? (
              <>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-2">
                    Included
                  </p>
                  <ul className="space-y-1.5 text-[13px] text-[#667085]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>{allowance} evaluations / period</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>All task types</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>Band reports &amp; fix cards</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>Learning guides</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-2">
                    Billing
                  </p>
                  <dl className="space-y-1.5 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">Status</dt>
                      <dd className="font-semibold text-[#027A48]">Active</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">Next charge</dt>
                      <dd className="font-semibold text-[#344054]">{renewalLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">Amount</dt>
                      <dd className="font-semibold text-[#344054]">{billingLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">Credits reset</dt>
                      <dd className="font-semibold text-[#344054]">On renewal</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-2">
                    Free trial
                  </p>
                  <p className="text-[13px] text-[#667085] leading-relaxed">
                    <span className="font-semibold text-[#344054]">1 free evaluation</span> included.
                    No card required to sign up. Full band report on your first essay.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-2">
                    Paid plans
                  </p>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-[#E4E7EC] px-3 py-2">
                      <p className="text-[12px] font-bold text-[#101828]">{SUBSCRIPTION_PLANS.weekly.name}</p>
                      <p className="text-[11px] text-[#667085]">
                        {SUBSCRIPTION_PLANS.weekly.label} · {SUBSCRIPTION_PLANS.weekly.credits} evals
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#B2DDFF] bg-[#F0F9FF] px-3 py-2">
                      <p className="text-[12px] font-bold text-[#101828]">
                        {SUBSCRIPTION_PLANS.monthly.name}
                        <span className="ml-1.5 text-[9px] font-bold text-[#1A96F3] uppercase">Best value</span>
                      </p>
                      <p className="text-[11px] text-[#667085]">
                        {SUBSCRIPTION_PLANS.monthly.label} · {SUBSCRIPTION_PLANS.monthly.credits} evals
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Context note */}
          <div className="px-5 sm:px-6 py-3 border-b border-[#F2F4F7] bg-[#FAFBFC]">
            {isSubscribed ? (
              <p className="text-[12px] text-[#667085] leading-relaxed">
                Use <span className="font-semibold text-[#344054]">Manage Subscription</span> to update your card,
                view invoices, switch plans, or cancel.
              </p>
            ) : (
              <p className="text-[12px] text-[#667085] leading-relaxed">
                {isExhausted
                  ? 'Your free credit is used. View Plans to choose Weekly or Monthly and continue grading.'
                  : 'When you need more practice, View Plans lets you pick Weekly or Monthly — checkout is on the next screen.'}
              </p>
            )}
          </div>

          {isWeekly && (
            <div className="px-5 sm:px-6 py-3 border-b border-[#F2F4F7] bg-gradient-to-r from-[#EFF8FF] to-[#F0F9FF] flex gap-2">
              <ArrowUpRight className="w-4 h-4 text-[#1A96F3] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#475467] leading-snug">
                <span className="font-semibold text-[#101828]">Upgrade to Monthly</span>
                {' — '}
                {SUBSCRIPTION_PLANS.monthly.credits} evaluations for {SUBSCRIPTION_PLANS.monthly.label}
                {' '}(~50% less per exam).
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 sm:px-6 py-4">
            {isSubscribed ? (
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => openBillingPortal(null, setCancelLoading)}
                  disabled={billingLoading || upgradeLoading || cancelLoading}
                  className="w-full sm:w-auto px-5 h-10 bg-white border border-[#D0D5DD] rounded-lg text-[13px] font-bold text-[#344054] hover:bg-[#F9FAFB] transition-all disabled:opacity-60"
                >
                  {cancelLoading ? 'Opening…' : 'Cancel Subscription'}
                </button>
                {isWeekly && (
                  <button
                    type="button"
                    onClick={() => openBillingPortal('subscription_update', setUpgradeLoading)}
                    disabled={billingLoading || upgradeLoading || cancelLoading}
                    className="w-full sm:w-auto px-5 h-10 bg-white border border-[#1A96F3] text-[#1A96F3] rounded-lg text-[13px] font-bold hover:bg-[#EFF8FF] transition-all disabled:opacity-60"
                  >
                    {upgradeLoading ? 'Opening…' : 'Upgrade to Monthly'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openBillingPortal(null, setBillingLoading)}
                  disabled={billingLoading || upgradeLoading || cancelLoading}
                  className="w-full sm:w-auto px-5 h-10 bg-[#344054] text-white rounded-lg text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                >
                  {billingLoading ? 'Opening…' : 'Manage Subscription'}
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/upgrade')}
                  className="w-full sm:w-auto px-8 h-10 bg-[#344054] text-white rounded-lg text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default SubscriptionPage;
