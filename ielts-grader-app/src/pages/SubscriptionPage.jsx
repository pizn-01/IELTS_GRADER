import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

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
  const [subscribeLoading, setSubscribeLoading] = useState(false);
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

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    setError('');
    try {
      const { url } = await api.createSubscriptionCheckout('monthly');
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to start checkout.');
      setSubscribeLoading(false);
    }
  };

  const remaining = status?.credits_remaining ?? user?.credits_remaining ?? 0;
  const allowance = status?.credits_allowance ?? user?.credits_allowance ?? 1;
  const isSubscribed = status?.is_subscribed;
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
                      onClick={openBillingPortal}
                      disabled={billingLoading}
                      className="w-full sm:w-auto px-8 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[13px] font-bold text-[#101828] hover:bg-gray-50 transition-all disabled:opacity-60"
                    >
                      {billingLoading ? 'Opening…' : 'Cancel Subscription'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/upgrade')}
                      className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                    >
                      Change Plan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={subscribeLoading}
                    className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                  >
                    {subscribeLoading ? 'Redirecting…' : 'Subscribe — from $9.99/week'}
                  </button>
                )}
              </div>
            </div>

            {isSubscribed ? (
            <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col items-center justify-center text-center">
              <div className="w-[52px] h-[52px] bg-[#E0F2FE] rounded-[12px] flex items-center justify-center text-[#1A96F3] mb-6">
                <CreditCard size={24} />
              </div>
              <h3 className="text-[20px] font-bold text-[#101828] mb-4">Manage Your Billing</h3>
              <p className="text-[14px] text-gray-400 leading-relaxed mb-8 max-w-[280px]">
                Update your payment method, switch plans, cancel your subscription, or view invoices.
              </p>
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={billingLoading}
                className="w-full max-w-[180px] h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
              >
                {billingLoading ? 'Opening…' : 'Manage Billing'}
              </button>
            </div>
            ) : (
            <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col items-center justify-center text-center">
              <div className="w-[52px] h-[52px] bg-[#ECFDF5] rounded-[12px] flex items-center justify-center text-[#10B981] mb-6">
                <CreditCard size={24} />
              </div>
              <h3 className="text-[20px] font-bold text-[#101828] mb-4">Ready to upgrade?</h3>
              <p className="text-[14px] text-gray-400 leading-relaxed mb-8 max-w-[280px]">
                Weekly Sprint — 20 exams for $9.99/week. Monthly Mastery — 100 exams for $24.99/month.
              </p>
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="w-full max-w-[180px] h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
              >
                View Plans
              </button>
            </div>
            )}
          </div>

          {remaining <= 2 && (
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[12px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#F59E0B] shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#F59E0B]">Low Credits Warning</h4>
                  <p className="text-[14px] text-gray-500 font-medium mt-0.5">
                    {remaining === 0
                      ? 'Subscribe to keep practicing — Weekly $9.99 (20 exams) or Monthly $24.99 (100 exams).'
                      : `Only ${remaining} credit${remaining === 1 ? '' : 's'} left this period.`}
                  </p>
                </div>
              </div>
              {!isSubscribed && (
                <button
                  type="button"
                  onClick={() => navigate('/upgrade')}
                  className="w-full md:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                  View Plans
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
