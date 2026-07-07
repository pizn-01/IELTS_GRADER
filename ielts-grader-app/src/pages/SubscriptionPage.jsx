import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertTriangle } from 'lucide-react';
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

  const barPct = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0;
  const barColor = remaining === 0
    ? 'bg-[#EA4335]'
    : remaining <= Math.max(2, Math.floor(allowance * 0.15))
    ? 'bg-[#F59E0B]'
    : 'bg-[#10B981]';

  const planLabel = isSubscribed
    ? (status?.plan_name || 'Subscription')
    : 'Free Trial';
  const renewalLabel = isSubscribed ? formatDate(status?.subscription_period_end) : '—';
  const billingLabel = isSubscribed
    ? (status?.billing_label || '—')
    : '1 free evaluation included';

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[50px] py-10 relative text-[#101828]">
      <h1 className="text-[32px] font-bold text-[#101828] mb-8">Your Subscription</h1>

      {error && (
        <div className="mb-6 text-[13px] font-medium text-[#EA4335] bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-[14px] text-gray-400">Loading subscription…</div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-8">
            <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col justify-between">
              <div className="space-y-[30px]">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#101828]">Current Plan</span>
                  <span className="text-[14px] font-medium text-gray-500">{planLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#101828]">Renewal Date</span>
                  <span className="text-[14px] font-medium text-gray-500">{renewalLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#101828]">Billing</span>
                  <span className="text-[14px] font-medium text-gray-500">{billingLabel}</span>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#101828]">
                      {remaining} {remaining === 1 ? 'credit' : 'credits'} remaining
                    </span>
                    <span className={`text-[14px] font-bold ${remaining === 0 ? 'text-[#EA4335]' : remaining <= 2 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                      {remaining === 0 ? 'All used' : `${barPct}%`}
                    </span>
                  </div>
                  <div className="h-[8px] bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-gray-400">
                    {isSubscribed
                      ? `${allowance} evaluations per billing period`
                      : 'Subscribe for 20/week or 100/month'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-12 mt-12 border-t border-[#D0D5DD]">
                {isSubscribed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openBillingPortal()}
                      disabled={billingLoading || upgradeLoading}
                      className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                    >
                      {billingLoading ? 'Opening…' : 'Manage Subscription'}
                    </button>
                    {isWeekly && (
                      <button
                        type="button"
                        onClick={() => openBillingPortal('subscription_update')}
                        disabled={billingLoading || upgradeLoading}
                        className="w-full sm:w-auto px-8 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[13px] font-bold text-[#101828] hover:bg-gray-50 transition-all disabled:opacity-60"
                      >
                        {upgradeLoading ? 'Opening…' : 'Upgrade to Monthly'}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/upgrade')}
                    className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                  >
                    View Plans
                  </button>
                )}
              </div>
            </div>

            {isSubscribed ? (
              <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col justify-center">
                <div className="w-[52px] h-[52px] bg-[#E0F2FE] rounded-[12px] flex items-center justify-center text-[#1A96F3] mb-6">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-[20px] font-bold text-[#101828] mb-4">Manage Subscription</h3>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                  Use <span className="font-semibold text-[#344054]">Manage Subscription</span> to:
                </p>
                <ul className="mt-4 space-y-2 text-[14px] text-[#667085]">
                  <li>Cancel your subscription</li>
                  <li>Switch between weekly and monthly</li>
                  <li>Update your payment method</li>
                  <li>View invoices and billing history</li>
                </ul>
              </div>
            ) : (
              <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col justify-center">
                <div className="w-[52px] h-[52px] bg-[#ECFDF5] rounded-[12px] flex items-center justify-center text-[#10B981] mb-6">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-[20px] font-bold text-[#101828] mb-4">Available Plans</h3>
                <ul className="space-y-4 text-[14px] text-[#667085]">
                  <li>
                    <span className="font-bold text-[#101828]">{SUBSCRIPTION_PLANS.weekly.name}</span>
                    <br />
                    {SUBSCRIPTION_PLANS.weekly.price}{SUBSCRIPTION_PLANS.weekly.period} — {SUBSCRIPTION_PLANS.weekly.credits} evaluations
                  </li>
                  <li>
                    <span className="font-bold text-[#101828]">{SUBSCRIPTION_PLANS.monthly.name}</span>
                    <span className="ml-2 text-[11px] font-semibold text-[#1A96F3] bg-[#EFF8FF] px-2 py-0.5 rounded-full">Best value</span>
                    <br />
                    {SUBSCRIPTION_PLANS.monthly.price}{SUBSCRIPTION_PLANS.monthly.period} — {SUBSCRIPTION_PLANS.monthly.credits} evaluations
                  </li>
                </ul>
              </div>
            )}
          </div>

          {remaining <= 2 && (
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[12px] p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#F59E0B] shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#F59E0B]">Low Credits Warning</h4>
                  <p className="text-[14px] text-gray-500 font-medium mt-0.5">
                    {remaining === 0
                      ? isSubscribed
                        ? 'You have used all credits for this billing period. Credits reset on your renewal date.'
                        : 'You have used your free evaluation. Choose a plan above to keep practicing.'
                      : `Only ${remaining} credit${remaining === 1 ? '' : 's'} left this period.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
