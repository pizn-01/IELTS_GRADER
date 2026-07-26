import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SUBSCRIPTION_PLANS, FREE_TRIAL_CREDITS } from '../constants/subscriptionPlans';
import { trackEvent } from '../utils/trackEvent';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ active, canceling }) {
  if (canceling) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#FFFAEB] text-[#B54708]">
        <Clock className="w-3 h-3" />
        Cancels soon
      </span>
    );
  }

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
          cancel_at_period_end: data.cancel_at_period_end,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [updateUser]);

  const openBillingPortal = async () => {
    setBillingLoading(true);
    setError('');
    try {
      const { url } = await api.createBillingPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to open billing portal.');
      setBillingLoading(false);
    }
  };

  const remaining = status?.credits_remaining ?? user?.credits_remaining ?? 0;
  const allowance = status?.credits_allowance ?? user?.credits_allowance ?? FREE_TRIAL_CREDITS;
  const isSubscribed = status?.is_subscribed;
  const cancelAtPeriodEnd = status?.cancel_at_period_end;

  const barPct = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0;
  const isLow = remaining > 0 && remaining <= Math.max(2, Math.floor(allowance * 0.15));
  const isExhausted = remaining === 0;

  const barColor = isExhausted ? 'bg-[#F04438]' : isLow ? 'bg-[#F59E0B]' : 'bg-[#12B76A]';
  const pctColor = isExhausted ? 'text-[#F04438]' : isLow ? 'text-[#F59E0B]' : 'text-[#12B76A]';

  const planLabel = isSubscribed ? (status?.plan_name || 'Subscription') : 'Free Trial';
  const periodEndLabel = isSubscribed ? formatDate(status?.subscription_period_end) : '—';
  const billingLabel = isSubscribed
    ? (status?.billing_label || '—')
    : `${FREE_TRIAL_CREDITS} free evaluations included`;

  const statusMessage = (() => {
    if (cancelAtPeriodEnd) {
      return `Cancellation scheduled. You keep access and remaining credits until ${periodEndLabel}, then credits reset to 0.`;
    }
    if (isSubscribed && isExhausted) {
      return 'All evaluations used this period. Credits reset on renewal.';
    }
    if (!isSubscribed && isExhausted) {
      return 'You have used your free evaluations. Subscribe to keep practicing.';
    }
    if (!isSubscribed && remaining > 0) {
      return `${remaining} free evaluation${remaining === 1 ? '' : 's'} remaining. No card required until you subscribe.`;
    }
    if (isLow) {
      return `Only ${remaining} credit${remaining === 1 ? '' : 's'} left this period.`;
    }
    return isSubscribed
      ? `${allowance} evaluations included each billing period.`
      : 'Subscribe for 20/week or 80/month after your free trial.';
  })();

  const statusTone = cancelAtPeriodEnd || (isExhausted && !isSubscribed) || isLow ? 'amber' : 'neutral';
  const isFreeView = !loading && !isSubscribed;

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 text-[#101828] ${
        isFreeView
          ? 'max-w-[920px] min-h-[calc(100dvh-56px)] flex flex-col justify-center py-3 sm:py-4'
          : 'max-w-[800px] py-8 sm:py-10'
      }`}
    >
      <header className={isFreeView ? 'mb-3 shrink-0' : 'mb-5'}>
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
        <section className={`bg-white rounded-2xl border border-[#D0D5DD] shadow-sm overflow-hidden ${isFreeView ? 'shrink-0' : ''}`}>
          <div
            className={`px-5 sm:px-6 flex flex-wrap items-start justify-between gap-3 border-b border-[#F2F4F7] ${
              !isSubscribed ? 'py-3 sm:py-3.5 bg-gradient-to-r from-[#FAFBFC] to-white' : 'py-4 sm:py-5'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[18px] font-bold text-[#101828]">{planLabel}</h2>
                <StatusBadge active={isSubscribed} canceling={cancelAtPeriodEnd} />
              </div>
              {isSubscribed ? (
                <p className="text-[13px] text-[#667085] mt-1">
                  {cancelAtPeriodEnd
                    ? `Access ends · ${periodEndLabel}`
                    : `Next renewal · ${periodEndLabel}`}
                </p>
              ) : (
                <p className="text-[13px] text-[#667085] mt-1">{billingLabel}</p>
              )}
            </div>
            <p className="text-[20px] font-bold text-[#101828]">
              {isSubscribed ? billingLabel : 'Free'}
            </p>
          </div>

          <div className={`px-5 sm:px-6 border-b border-[#F2F4F7] ${!isSubscribed ? 'py-3' : 'py-4'}`}>
            <div className={!isSubscribed ? 'rounded-xl border border-[#F2F4F7] bg-[#FAFBFC] p-3' : ''}>
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
              className={`rounded-lg px-3 py-2 flex gap-2 ${
                !isSubscribed ? 'mt-2' : 'mt-3'
              } ${
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
          </div>

          <div
            className={`px-5 sm:px-6 border-b border-[#F2F4F7] grid sm:grid-cols-2 ${
              !isSubscribed ? 'py-3 sm:py-4 gap-3 sm:gap-4' : 'py-4 gap-5 sm:gap-6'
            }`}
          >
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
                      <dd className={`font-semibold ${cancelAtPeriodEnd ? 'text-[#B54708]' : 'text-[#027A48]'}`}>
                        {cancelAtPeriodEnd ? 'Canceling' : 'Active'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">{cancelAtPeriodEnd ? 'Access ends' : 'Next charge'}</dt>
                      <dd className="font-semibold text-[#344054]">{periodEndLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">Amount</dt>
                      <dd className="font-semibold text-[#344054]">{billingLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#667085]">After period ends</dt>
                      <dd className="font-semibold text-[#344054]">Credits reset to 0</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[#E4E7EC] bg-[#FAFBFC] p-3 h-full">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-2">
                    Free trial
                  </p>
                  <p className="text-[13px] text-[#667085] leading-relaxed">
                    <span className="font-semibold text-[#344054]">{FREE_TRIAL_CREDITS} free evaluations</span> included.
                    No card required to sign up. Full band report on your first essay.
                  </p>
                </div>
                <div className="rounded-xl border border-[#E4E7EC] bg-white p-3 h-full">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-2">
                    Paid plans
                  </p>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFBFC] px-3 py-2.5">
                      <p className="text-[12px] font-bold text-[#101828]">{SUBSCRIPTION_PLANS.weekly.name}</p>
                      <p className="text-[11px] text-[#667085] mt-0.5">
                        {SUBSCRIPTION_PLANS.weekly.label} · {SUBSCRIPTION_PLANS.weekly.credits} evals
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#B2DDFF] bg-[#F0F9FF] px-3 py-2.5 shadow-sm">
                      <p className="text-[12px] font-bold text-[#101828]">
                        {SUBSCRIPTION_PLANS.monthly.name}
                        <span className="ml-1.5 text-[9px] font-bold text-[#1A96F3] uppercase">Best value</span>
                      </p>
                      <p className="text-[11px] text-[#667085] mt-0.5">
                        {SUBSCRIPTION_PLANS.monthly.label} · {SUBSCRIPTION_PLANS.monthly.credits} evals
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div
            className={`px-5 sm:px-6 border-b border-[#F2F4F7] ${
              isSubscribed ? 'py-3 bg-[#FAFBFC]' : 'py-2.5 bg-[#F9FAFB] rounded-none'
            }`}
          >
            {isSubscribed ? (
              <div className="text-[12px] text-[#667085] leading-relaxed space-y-1.5">
                <p>
                  <span className="font-semibold text-[#344054]">Manage Subscription</span> opens Stripe
                  where you can cancel, upgrade, update your card, or view invoices.
                </p>
                {cancelAtPeriodEnd ? (
                  <p>
                    Your cancellation is already confirmed for {periodEndLabel}. To keep your plan,
                    choose <span className="font-semibold text-[#344054]">Don&apos;t cancel subscription</span> in Stripe.
                  </p>
                ) : (
                  <p>
                    To cancel: open Manage Subscription → select your plan →{' '}
                    <span className="font-semibold text-[#344054]">Cancel plan</span>. You keep access until the period ends.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-[#667085] leading-relaxed px-1">
                {isExhausted
                  ? 'Your free credits are used. View Plans to choose Weekly or Monthly and continue grading.'
                  : 'When you need more practice, View Plans lets you pick Weekly or Monthly. Checkout is on the next screen.'}
              </p>
            )}
          </div>

          <div className={`px-5 sm:px-6 ${!isSubscribed ? 'py-3 bg-[#FAFBFC]' : 'py-4'}`}>
            {isSubscribed ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openBillingPortal}
                  disabled={billingLoading}
                  className="w-full sm:w-auto px-8 h-10 bg-[#344054] text-white rounded-lg text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                >
                  {billingLoading ? 'Opening…' : 'Manage Subscription'}
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('upgrade_cta_clicked', { source: 'subscription_page' });
                    navigate('/upgrade');
                  }}
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
