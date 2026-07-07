import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, X, Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState('Smart Top Up');
  const [successType, setSuccessType] = useState('subscription');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');

  const packs = [
    { name: 'Starter Top Up',   credits: '10', price: '$12', desc: 'Best for short practice sprints',    priceId: 'price_1TcqK9FDM9NsOfLRmmYyoSTh' },
    { name: 'Smart Top Up',     credits: '24', price: '$24', desc: 'Most chosen by active learners',     priceId: 'price_1TcqPbFDM9NsOfLRquDNOJpA' },
    { name: 'Intensive Top Up', credits: '50', price: '$44', desc: 'For speaking + writing every week',  priceId: 'price_1TcqRfFDM9NsOfLRbZgZMEKc' },
  ];

  const handlePayForPack = async () => {
    const pack = packs.find(p => p.name === selectedPack);
    if (!pack) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const { url } = await api.createCheckoutSession(pack.priceId);
      window.location.href = url;
    } catch (err) {
      setCheckoutError(err.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    setBillingError('');
    try {
      const { url } = await api.createBillingPortalSession();
      window.location.href = url;
    } catch (err) {
      setBillingError(err.message || 'Failed to open billing portal. Please try again.');
      setBillingLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[50px] py-10 relative text-[#101828]">
      <h1 className="text-[32px] font-bold text-[#101828] mb-8">Your Subscription</h1>

      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-8">
          {/* Left Column: Current Plan */}
          <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col justify-between">
            <div className="space-y-[30px]">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#101828]">Current Plan</span>
                <span className="text-[14px] font-medium text-gray-500">Weekly Sprint</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#101828]">Renewal Date</span>
                <span className="text-[14px] font-medium text-gray-500">Mar 30, 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#101828]">Billing</span>
                <span className="text-[14px] font-medium text-gray-500">$9.99 / week</span>
              </div>

              <div className="space-y-4 pt-4">
                {(() => {
                  const remaining = user?.credits_remaining ?? 0;
                  const barPct = Math.min(100, Math.max(0, Math.round((remaining / 5) * 100)));
                  const barColor = remaining === 0
                    ? 'bg-[#EA4335]'
                    : remaining <= 2
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#10B981]';
                  return (
                    <>
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
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-12 mt-12 border-t border-[#D0D5DD]">
              {user?.has_paid && (
                <button
                  onClick={() => setShowRetentionModal(true)}
                  className="w-full sm:w-auto px-8 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[13px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                >
                  Cancel Subscription
                </button>
              )}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
              >
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Right Column: Manage Billing */}
          <div className="bg-white rounded-[20px] border border-[#D0D5DD] shadow-sm p-6 md:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-[52px] h-[52px] bg-[#E0F2FE] rounded-[12px] flex items-center justify-center text-[#1A96F3] mb-6">
              <CreditCard size={24} />
            </div>
            <h3 className="text-[20px] font-bold text-[#101828] mb-4">Manage Your Billing</h3>
            <p className="text-[14px] text-gray-400 leading-relaxed mb-4 max-w-[280px]">
              Click the button below to change your plan, payment method, cancel subscription or view your invoices.
            </p>
            {billingError && (
              <p className="text-[13px] font-medium text-[#EA4335] mb-4 max-w-[280px]">{billingError}</p>
            )}
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={billingLoading}
              className="w-full max-w-[180px] h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
            >
              {billingLoading ? 'Opening…' : 'Manage Billing'}
            </button>
          </div>
        </div>

        {/* Low Credits Warning Banner */}
        {(user?.credits_remaining ?? 0) <= 2 && (
          <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[12px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#F59E0B] shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-[#F59E0B]">Low Credits Warning</h4>
                <p className="text-[14px] text-gray-500 font-medium mt-0.5">Less than 3 tests left. Keep your streak going.</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="w-full md:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
            >
              Top Up Credit
            </button>
          </div>
        )}
      </div>

      {/* Retention Modal */}
      {showRetentionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-[560px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowRetentionModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-[#101828] transition-colors">
              <X size={24} />
            </button>
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#1A96F3] rounded-full flex items-center justify-center text-white mb-6">
                <Target size={40} />
              </div>
              <h2 className="text-[24px] font-bold text-[#101828] mb-3">You're close to Band 7.5!</h2>
              <p className="text-[15px] text-gray-500 font-medium leading-relaxed mb-10 max-w-[340px]">
                Keep practicing - you're only a few sessions away from your goal.
              </p>
              <div className="w-full space-y-4">
                <button onClick={() => setShowRetentionModal(false)} className="w-full h-[56px] bg-[#344054] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm">
                  Keep Practicing
                </button>
                <button
                  onClick={() => { setShowRetentionModal(false); setSuccessType('cancellation'); setShowSuccessModal(true); }}
                  className="w-full h-[56px] bg-white border border-gray-200 rounded-[12px] text-[15px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                >
                  Cancel Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[560px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowSuccessModal(false)} className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-[#101828] transition-colors z-10">
              <X size={24} />
            </button>
            <div className="p-6 md:p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1A96F3] rounded-full flex items-center justify-center text-white mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-[20px] md:text-[24px] font-bold text-[#101828] mb-4">
                {successType === 'subscription' ? 'Subscription Successful' : 'Subscription Cancelled'}
              </h2>
              <p className="text-[14px] md:text-[15px] text-gray-500 font-medium leading-relaxed mb-8 md:mb-10 max-w-[400px]">
                {successType === 'subscription'
                  ? `You have successfully subscribed to the ${selectedPack}. Your credits have been added to your account.`
                  : 'Your subscription has been cancelled successfully. You will continue to have access until the end of your current billing period.'}
              </p>
              <div className="w-full space-y-4">
                <button
                  onClick={() => { setShowSuccessModal(false); if (successType === 'cancellation') navigate('/dashboard'); }}
                  className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                  {successType === 'subscription' ? 'Done' : 'Go to Dashboard'}
                </button>
                {successType === 'cancellation' && (
                  <button
                    onClick={() => { setShowSuccessModal(false); setShowTopUpModal(true); }}
                    className="w-full h-[52px] md:h-[56px] bg-white border border-gray-200 rounded-[12px] text-[14px] md:text-[15px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                  >
                    Resubscribe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[560px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowErrorModal(false)} className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-[#101828] transition-colors z-10">
              <X size={24} />
            </button>
            <div className="p-6 md:p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#EA4335] rounded-full flex items-center justify-center text-white mb-6">
                <X size={40} strokeWidth={3} />
              </div>
              <h2 className="text-[20px] md:text-[24px] font-bold text-[#101828] mb-4">Cancellation Failed</h2>
              <p className="text-[14px] md:text-[15px] text-gray-500 font-medium leading-relaxed mb-8 md:mb-10 max-w-[420px]">
                We couldn't cancel your subscription at the moment. Please try again or contact support if the issue persists.
              </p>
              <button onClick={() => setShowErrorModal(false)} className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[600px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
            <div className="px-6 md:px-10 py-6 md:py-8 flex items-center justify-between shrink-0">
              <h2 className="text-[18px] md:text-[20px] font-bold text-[#101828] leading-tight pr-8">Choose a Credit Pack and keep Practicing</h2>
              <button onClick={() => setShowTopUpModal(false)} className="text-gray-400 hover:text-[#101828] transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="px-6 md:px-10 pb-8 md:pb-10 space-y-4 overflow-y-auto">
              {packs.map((pack) => (
                <div
                  key={pack.name}
                  onClick={() => setSelectedPack(pack.name)}
                  className={`p-4 md:p-6 rounded-[16px] border-2 cursor-pointer transition-all ${
                    selectedPack === pack.name
                      ? 'border-[#1A96F3] bg-[#F0F9FF]'
                      : 'border-[#D0D5DD] bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-[13px] md:text-[14px] font-bold text-[#101828]">{pack.name}</h3>
                      <p className="text-[20px] md:text-[24px] font-black text-[#101828] mt-1">{pack.price}</p>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-[20px] md:text-[24px] font-black text-[#101828]">{pack.credits}</span>
                      <span className="text-[12px] md:text-[14px] font-bold text-gray-400">Credits</span>
                    </div>
                  </div>
                  <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">{pack.desc}</p>
                </div>
              ))}
              <div className="pt-4 md:pt-6 space-y-3">
                {checkoutError && (
                  <p className="text-[13px] font-medium text-[#EA4335] text-center">{checkoutError}</p>
                )}
                <button
                  onClick={handlePayForPack}
                  disabled={checkoutLoading}
                  className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                >
                  {checkoutLoading ? 'Redirecting to Stripe…' : 'Pay & Add Credits'}
                </button>
                <button
                  onClick={() => setShowTopUpModal(false)}
                  className="w-full h-[52px] md:h-[56px] bg-white border border-gray-200 rounded-[12px] text-[14px] md:text-[15px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
