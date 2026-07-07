import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
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

function DetailRow({ label, value, valueClass = 'text-gray-500' }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F2F4F7] last:border-0">
      <span className="text-[14px] font-bold text-[#101828]">{label}</span>
      <span className={`text-[14px] font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
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
  const isMonthly = isSubscribed && currentPlan === 'monthly';

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
      return 'All evaluations used for this billing period. Credits reset on your renewal date.';
    }
    if (!isSubscribed && isExhausted) {
      return 'You have used your free evaluation. Subscribe to keep practicing and unlock more credits.';
    }
    if (!isSubscribed && remaining > 0) {
      return `You have ${remaining} free evaluation remaining. No card required until you subscribe.`;
    }
    if (isLow) {
      return `Only ${remaining} evaluation${remaining === 1 ? '' : 's'} left this period.`;
    }
    return isSubscribed
      ? `${allowance} evaluations included each billing period.`
      : 'Subscribe for 20 evaluations/week or 100/month after your free trial.';
  })();

  const statusTone = isExhausted && !isSubscribed
    ? 'amber'
    : isExhausted
    ? 'neutral'
    : isLow
    ? 'amber'
    : 'neutral';

  return (
    <div className="w-full max-w-[1100px] mx-auto px-6 md:px-[50px] py-10 text-[#101828]">
      <header className="mb-8">
        <h1 className="text-[32px] font-bold text-[#101828]">Your Subscription</h1>
        <p className="text-[15px] text-[#667085] mt-1">
          View your plan, track usage, and manage billing.
        </p>
      </header>

      {error && (
        <div className="mb-6 text-[13px] font-medium text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#D0D5DD] rounded-[20px] p-12 shadow-sm">
          <p className="text-[14px] text-[#98A2B3]">Loading subscription details…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-8 animate-in fade-in duration-500">
          {/* Main card */}
          <section className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm flex flex-col">
            <div className="px-6 md:px-10 pt-8 pb-6 border-b border-[#F2F4F7]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">
                    Current plan
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-[22px] font-bold text-[#101828]">{planLabel}</h2>
                    <StatusBadge active={isSubscribed} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-medium text-[#98A2B3] mb-0.5">Billing</p>
                  <p className="text-[18px] font-bold text-[#101828]">
                    {isSubscribed ? billingLabel : 'Free'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 md:px-10 py-6 flex-1 space-y-6">
              <div className="rounded-xl border border-[#F2F4F7] bg-[#FAFBFC] px-5 py-1">
                <DetailRow label="Plan" value={planLabel} />
                <DetailRow label="Renewal date" value={renewalLabel} />
                <DetailRow label="Billing cycle" value={billingLabel} />
              </div>

              {/* Credits usage */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] font-bold text-[#101828]">
                    {remaining} {remaining === 1 ? 'credit' : 'credits'} remaining
                  </p>
                  <span className={`text-[14px] font-bold ${pctColor}`}>
                    {isExhausted ? 'All used' : `${barPct}%`}
                  </span>
                </div>
                <div className="h-[8px] bg-[#F2F4F7] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <p className="text-[12px] text-[#98A2B3] mt-2">
                  {remaining} of {allowance} evaluations available this period
                </p>
              </div>

              {/* Status callout */}
              <div
                className={`rounded-xl px-4 py-3.5 flex gap-3 ${
                  statusTone === 'amber'
                    ? 'bg-[#FFFBEB] border border-[#FEF3C7]'
                    : 'bg-[#F9FAFB] border border-[#F2F4F7]'
                }`}
              >
                {statusTone === 'amber' ? (
                  <AlertCircle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                ) : isSubscribed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#12B76A] shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-5 h-5 text-[#1A96F3] shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-[13px] font-medium leading-relaxed ${
                    statusTone === 'amber' ? 'text-[#92400E]' : 'text-[#475467]'
                  }`}
                >
                  {statusMessage}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 md:px-10 py-5 bg-[#FAFBFC] border-t border-[#F2F4F7] rounded-b-[20px]">
              {isSubscribed ? (
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openBillingPortal(null, setCancelLoading)}
                    disabled={billingLoading || upgradeLoading || cancelLoading}
                    className="w-full sm:w-auto px-6 h-[44px] bg-white border border-[#D0D5DD] rounded-[10px] text-[13px] font-bold text-[#344054] hover:bg-[#F9FAFB] transition-all disabled:opacity-60"
                  >
                    {cancelLoading ? 'Opening…' : 'Cancel Subscription'}
                  </button>
                  {isWeekly && (
                    <button
                      type="button"
                      onClick={() => openBillingPortal('subscription_update', setUpgradeLoading)}
                      disabled={billingLoading || upgradeLoading || cancelLoading}
                      className="w-full sm:w-auto px-6 h-[44px] bg-white border border-[#1A96F3] text-[#1A96F3] rounded-[10px] text-[13px] font-bold hover:bg-[#EFF8FF] transition-all disabled:opacity-60"
                    >
                      {upgradeLoading ? 'Opening…' : 'Upgrade to Monthly'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openBillingPortal(null, setBillingLoading)}
                    disabled={billingLoading || upgradeLoading || cancelLoading}
                    className="w-full sm:w-auto px-6 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                  >
                    {billingLoading ? 'Opening…' : 'Manage Subscription'}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/upgrade')}
                    className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                  >
                    View Plans
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Context panel — info only, no duplicate CTA */}
          <aside className="space-y-6">
            {isSubscribed ? (
              <>
                <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-8">
                  <div className="w-[48px] h-[48px] bg-[#E0F2FE] rounded-[12px] flex items-center justify-center text-[#1A96F3] mb-5">
                    <CreditCard size={22} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#101828] mb-3">Your plan includes</h3>
                  <ul className="space-y-2.5 text-[14px] text-[#667085]">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>{allowance} full AI evaluations per billing period</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>Academic &amp; General Training — all task types</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>Detailed band reports, fix cards &amp; grammar analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
                      <span>Personalized learning guides</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-8">
                  <div className="w-[48px] h-[48px] bg-[#F2F4F7] rounded-[12px] flex items-center justify-center text-[#475467] mb-5">
                    <Calendar size={22} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#101828] mb-3">Billing summary</h3>
                  <dl className="space-y-3 text-[14px]">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#667085]">Status</dt>
                      <dd className="font-semibold text-[#027A48]">Active</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#667085]">Next charge</dt>
                      <dd className="font-semibold text-[#344054]">{renewalLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#667085]">Amount</dt>
                      <dd className="font-semibold text-[#344054]">{billingLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#667085]">Credits reset</dt>
                      <dd className="font-semibold text-[#344054] flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" />
                        On renewal
                      </dd>
                    </div>
                  </dl>
                </div>

                {isWeekly && (
                  <div className="bg-gradient-to-br from-[#EFF8FF] to-[#F0F9FF] rounded-[20px] border border-[#B2DDFF] p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="w-5 h-5 text-[#1A96F3]" />
                      <h3 className="text-[16px] font-bold text-[#101828]">Save with Monthly</h3>
                    </div>
                    <p className="text-[14px] text-[#475467] leading-relaxed mb-1">
                      {SUBSCRIPTION_PLANS.monthly.credits} evaluations for {SUBSCRIPTION_PLANS.monthly.label}
                      — about 50% less per exam than weekly.
                    </p>
                    <p className="text-[12px] text-[#667085]">
                      Use <span className="font-semibold">Upgrade to Monthly</span> on the left to switch plans.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-8">
                  <div className="w-[48px] h-[48px] bg-[#ECFDF5] rounded-[12px] flex items-center justify-center text-[#12B76A] mb-5">
                    <Sparkles size={22} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#101828] mb-3">Free trial</h3>
                  <p className="text-[14px] text-[#667085] leading-relaxed mb-4">
                    Every new account includes <span className="font-semibold text-[#344054]">1 free full evaluation</span>.
                    No credit card required to sign up or try your first essay.
                  </p>
                  <ul className="space-y-2 text-[13px] text-[#667085]">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                      Full band report on your first submission
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                      Same quality as paid plans
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-8">
                  <div className="w-[48px] h-[48px] bg-[#F2F4F7] rounded-[12px] flex items-center justify-center text-[#475467] mb-5">
                    <CreditCard size={22} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#101828] mb-3">After your free trial</h3>
                  <p className="text-[14px] text-[#667085] leading-relaxed mb-4">
                    {isExhausted
                      ? 'Your free credit has been used. Choose a plan to continue grading essays.'
                      : 'When you are ready for more practice, pick a subscription:'}
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-[#E4E7EC] px-4 py-3">
                      <p className="text-[13px] font-bold text-[#101828]">{SUBSCRIPTION_PLANS.weekly.name}</p>
                      <p className="text-[12px] text-[#667085] mt-0.5">
                        {SUBSCRIPTION_PLANS.weekly.label} · {SUBSCRIPTION_PLANS.weekly.credits} evaluations
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#B2DDFF] bg-[#F0F9FF] px-4 py-3">
                      <p className="text-[13px] font-bold text-[#101828]">
                        {SUBSCRIPTION_PLANS.monthly.name}
                        <span className="ml-2 text-[10px] font-bold text-[#1A96F3] uppercase">Best value</span>
                      </p>
                      <p className="text-[12px] text-[#667085] mt-0.5">
                        {SUBSCRIPTION_PLANS.monthly.label} · {SUBSCRIPTION_PLANS.monthly.credits} evaluations
                      </p>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#98A2B3] mt-4">
                    Plans and checkout are on the next screen — use View Plans when you are ready.
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
