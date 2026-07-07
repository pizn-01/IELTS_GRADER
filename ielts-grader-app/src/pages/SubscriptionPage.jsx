import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ active, label }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${
        active
          ? 'bg-[#ECFDF5] text-[#027A48]'
          : 'bg-[#F2F4F7] text-[#475467]'
      }`}
    >
      {label}
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

  const openBillingPortal = async (flow) => {
    const isUpgrade = flow === 'subscription_update';
    if (isUpgrade) setUpgradeLoading(true);
    else setBillingLoading(true);
    setError('');
    try {
      const { url } = await api.createBillingPortalSession(
        isUpgrade ? { flow: 'subscription_update' } : {}
      );
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to open billing portal.');
      if (isUpgrade) setUpgradeLoading(false);
      else setBillingLoading(false);
    }
  };

  const remaining = status?.credits_remaining ?? user?.credits_remaining ?? 0;
  const allowance = status?.credits_allowance ?? user?.credits_allowance ?? 1;
  const isSubscribed = status?.is_subscribed;
  const currentPlan = status?.subscription_plan;
  const isWeekly = isSubscribed && currentPlan === 'weekly';

  const used = Math.max(0, allowance - remaining);
  const barPct = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0;

  const planName = isSubscribed ? (status?.plan_name || 'Subscription') : 'Free Trial';
  const billingAmount = isSubscribed ? (status?.billing_label || '—') : 'Free';
  const renewalDate = isSubscribed ? formatDate(status?.subscription_period_end) : null;

  return (
    <div className="w-full max-w-[720px] mx-auto px-6 py-10 md:py-14 text-[#101828]">
      <header className="mb-8">
        <h1 className="text-[28px] font-bold text-[#101828] tracking-tight">Billing</h1>
        <p className="text-[15px] text-[#667085] mt-1">
          Manage your plan, usage, and payment details.
        </p>
      </header>

      {error && (
        <div className="mb-6 text-[13px] font-medium text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#E4E7EC] rounded-xl p-8">
          <p className="text-[14px] text-[#98A2B3]">Loading billing details…</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Current plan */}
          <section className="bg-white border border-[#E4E7EC] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#E4E7EC] flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-1">
                  Current plan
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-[20px] font-bold text-[#101828]">{planName}</h2>
                  <StatusBadge
                    active={isSubscribed}
                    label={isSubscribed ? 'Active' : 'Free'}
                  />
                </div>
              </div>
              <p className="text-[18px] font-bold text-[#101828] shrink-0">{billingAmount}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Usage */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[14px] font-medium text-[#344054]">Evaluations remaining</p>
                  <p className="text-[14px] text-[#667085]">
                    <span className="font-bold text-[#101828]">{remaining}</span>
                    <span className="text-[#98A2B3]"> / {allowance}</span>
                  </p>
                </div>
                <div className="h-2 bg-[#F2F4F7] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      remaining === 0 ? 'bg-[#F04438]' : 'bg-[#12B76A]'
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <p className="text-[13px] text-[#98A2B3] mt-2">
                  {remaining === 0
                    ? isSubscribed
                      ? 'Resets on your next renewal date.'
                      : 'Subscribe to continue grading essays.'
                    : `${used} used this period`}
                </p>
              </div>

              {/* Billing details */}
              {isSubscribed && renewalDate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="rounded-lg bg-[#F9FAFB] border border-[#F2F4F7] px-4 py-3">
                    <p className="text-[12px] font-medium text-[#98A2B3] mb-0.5">Next renewal</p>
                    <p className="text-[14px] font-semibold text-[#344054]">{renewalDate}</p>
                  </div>
                  <div className="rounded-lg bg-[#F9FAFB] border border-[#F2F4F7] px-4 py-3">
                    <p className="text-[12px] font-medium text-[#98A2B3] mb-0.5">Allowance</p>
                    <p className="text-[14px] font-semibold text-[#344054]">
                      {allowance} evaluations / period
                    </p>
                  </div>
                </div>
              )}

              {!isSubscribed && (
                <div className="rounded-lg bg-[#F9FAFB] border border-[#F2F4F7] px-4 py-3">
                  <p className="text-[12px] font-medium text-[#98A2B3] mb-0.5">Included</p>
                  <p className="text-[14px] font-semibold text-[#344054]">1 free evaluation — no card required</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E4E7EC] flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              {isSubscribed ? (
                <>
                  {isWeekly && (
                    <button
                      type="button"
                      onClick={() => openBillingPortal('subscription_update')}
                      disabled={billingLoading || upgradeLoading}
                      className="w-full sm:w-auto order-2 sm:order-1 px-5 h-[40px] bg-white border border-[#D0D5DD] rounded-lg text-[14px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors disabled:opacity-60"
                    >
                      {upgradeLoading ? 'Opening…' : 'Upgrade to Monthly'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openBillingPortal()}
                    disabled={billingLoading || upgradeLoading}
                    className="w-full sm:w-auto order-1 sm:order-2 px-5 h-[40px] bg-[#101828] text-white rounded-lg text-[14px] font-semibold hover:bg-[#1D2939] transition-colors disabled:opacity-60"
                  >
                    {billingLoading ? 'Opening…' : 'Manage Subscription'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/upgrade')}
                  className="w-full sm:w-auto px-5 h-[40px] bg-[#101828] text-white rounded-lg text-[14px] font-semibold hover:bg-[#1D2939] transition-colors"
                >
                  View Plans
                </button>
              )}
            </div>
          </section>

          {isSubscribed && (
            <p className="text-[13px] text-[#98A2B3] text-center">
              Cancel, change plan, or update your payment method in Manage Subscription.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
