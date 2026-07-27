import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { NewUserPromoBanner, PromoPriceDisplay } from '../components/PromoPricing';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_FEATURES,
  SUBSCRIPTION_PLAN_NOTE,
  formatPromoPrice,
} from '../constants/subscriptionPlans';

const PLANS = [SUBSCRIPTION_PLANS.weekly, SUBSCRIPTION_PLANS.monthly];

function normalizePlanKey(value) {
  if (value === 'weekly' || value === 'monthly') return value;
  return null;
}

const UpgradePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const planFromUrl = normalizePlanKey(searchParams.get('plan'));
  const autoCheckout = searchParams.get('checkout') === '1';
  const autoCheckoutStarted = useRef(false);

  const [selectedKey, setSelectedKey] = useState(planFromUrl || PLANS[0].key);
  const [loading, setLoading] = useState(autoCheckout);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (planFromUrl) setSelectedKey(planFromUrl);
  }, [planFromUrl]);

  useEffect(() => {
    api.getSubscriptionStatus()
      .then((data) => {
        setStatus(data);
        if (data?.is_subscribed && data.subscription_plan === 'weekly' && !planFromUrl) {
          setSelectedKey('monthly');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setStatusLoading(false));
  }, [planFromUrl]);

  const currentPlan = status?.subscription_plan;
  const isSubscribed = status?.is_subscribed;
  const isWeekly = isSubscribed && currentPlan === 'weekly';
  const isMonthly = isSubscribed && currentPlan === 'monthly';

  // Show sale UI for unpaid users. Prefer API eligible; also show when !has_paid
  // so the discount is visible even if promo.active briefly mismatches.
  const promoEligible = status
    ? Boolean(status.promo?.eligible) || (!status.has_paid && !isSubscribed)
    : false;

  const selectedPlan = PLANS.find((p) => p.key === selectedKey) || PLANS[0];
  const selectedPricing = formatPromoPrice(selectedPlan, { showPromo: promoEligible });
  const monthlyPricing = formatPromoPrice(SUBSCRIPTION_PLANS.monthly, { showPromo: false });

  const clearCheckoutParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  };

  const handleSubscribe = async (planKey = selectedKey) => {
    if (isSubscribed) return;
    setLoading(true);
    setError('');
    try {
      const { url } = await api.createSubscriptionCheckout(planKey);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
      clearCheckoutParams();
    }
  };

  useEffect(() => {
    if (statusLoading || !autoCheckout || autoCheckoutStarted.current) return;
    if (!status) {
      if (error) {
        autoCheckoutStarted.current = true;
        setLoading(false);
        clearCheckoutParams();
      }
      return;
    }
    if (status.is_subscribed) {
      clearCheckoutParams();
      setLoading(false);
      return;
    }
    autoCheckoutStarted.current = true;
    const planKey = planFromUrl || selectedKey;
    handleSubscribe(planKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when status is ready for checkout deep-link
  }, [statusLoading, status, autoCheckout, planFromUrl, selectedKey, error]);

  const openBillingPortal = async (flow) => {
    setPortalLoading(true);
    setError('');
    try {
      const { url } = await api.createBillingPortalSession(
        flow === 'subscription_update' ? { flow: 'subscription_update' } : {}
      );
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  };

  if (statusLoading || (autoCheckout && loading && !error)) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <p className="text-[14px] text-gray-400">
          {autoCheckout ? 'Redirecting to Stripe…' : 'Loading plans…'}
        </p>
      </div>
    );
  }

  if (isMonthly) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <h1 className="text-[28px] md:text-[32px] font-bold text-[#101828] mb-4 text-center">
          You&apos;re on Monthly Mastery
        </h1>
        <p className="text-[15px] text-[#667085] mb-10 text-center max-w-md">
          You have an active monthly subscription with {SUBSCRIPTION_PLANS.monthly.credits} evaluations per month.
        </p>
        <div className="w-full max-w-[540px] bg-white border border-[#E5E7EB] rounded-[24px] shadow-sm p-8 md:p-10 text-center">
          {error && (
            <p className="text-[13px] text-[#EA4335] bg-red-50 rounded-[8px] px-4 py-2.5 mb-4">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => openBillingPortal()}
            disabled={portalLoading}
            className="w-full h-[52px] bg-[#101828] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
          >
            {portalLoading ? 'Opening…' : 'Manage Subscription'}
          </button>
          <p className="text-center text-[13px] text-[#667085] mt-4">
            Cancel, switch plans, or update payment in the billing portal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <h1 className="text-[28px] md:text-[32px] font-bold text-[#101828] mb-6 text-center">
        {isWeekly ? 'Upgrade Your Plan' : 'Choose a Plan'}
      </h1>

      <div className="w-full max-w-[540px] bg-white border border-[#E5E7EB] rounded-[24px] shadow-sm p-8 md:p-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-bold text-[#101828]">Premium Plan</h2>
          {!isWeekly && (
            <span className="text-[13px] font-semibold text-[#475467] bg-[#F2F4F7] px-4 py-1.5 rounded-full">
              Best value: Monthly
            </span>
          )}
        </div>

        {!isWeekly && promoEligible && <NewUserPromoBanner compact />}

        {!isWeekly && (
          <div className="bg-[#F2F4F7] rounded-full px-4 py-2.5 mb-6 text-center">
            <p className="text-[13px] font-medium text-[#475467] leading-snug">
              {SUBSCRIPTION_PLAN_NOTE}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {PLANS.map((plan) => {
            const isCurrent = isWeekly && plan.key === 'weekly';
            const disabled = isCurrent;
            const pricing = formatPromoPrice(plan, { showPromo: promoEligible && !isCurrent });
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => !disabled && setSelectedKey(plan.key)}
                disabled={disabled}
                className={`p-5 rounded-[16px] border-2 text-left transition-all relative overflow-hidden ${
                  isCurrent
                    ? 'border-[#12B76A] bg-[#ECFDF5] opacity-90 cursor-default'
                    : selectedKey === plan.key
                      ? 'border-[#059669] bg-[#ECFDF5] shadow-[0_0_0_1px_rgba(5,150,105,0.2)]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#6EE7B7]'
                }`}
              >
                {pricing.showPromo && (
                  <span className="absolute top-0 right-0 bg-[#059669] text-white text-[9px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-bl-[10px]">
                    50% OFF
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-[#12B76A] uppercase">
                    Current
                  </span>
                )}
                {plan.recommended && !isCurrent && !pricing.showPromo && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-[#1A96F3] uppercase">
                    Best value
                  </span>
                )}
                <p className="text-[13px] font-medium text-[#667085] mb-2">{plan.name}</p>
                {pricing.showPromo ? (
                  <PromoPriceDisplay
                    originalPrice={pricing.originalPrice}
                    displayPrice={pricing.displayPrice}
                    period={pricing.period}
                    size="md"
                  />
                ) : (
                  <p className="text-[20px] font-bold text-[#101828]">
                    {pricing.displayPrice}
                    <span className="text-[14px] font-semibold text-[#667085]">{pricing.period}</span>
                  </p>
                )}
                <p className="text-[11px] text-[#667085] mt-2">{plan.credits} evaluations</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 mb-8">
          {SUBSCRIPTION_FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#12B76A] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <span className="text-[14px] text-[#344054] leading-snug">{feature}</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[13px] text-[#EA4335] bg-red-50 rounded-[8px] px-4 py-2.5 mb-4 text-center">
            {error}
          </p>
        )}

        {isWeekly ? (
          <button
            type="button"
            onClick={() => openBillingPortal('subscription_update')}
            disabled={portalLoading}
            className="w-full h-[52px] bg-[#101828] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60 mb-4"
          >
            {portalLoading
              ? 'Opening…'
              : `Upgrade to Monthly (${monthlyPricing.displayPrice}${monthlyPricing.period})`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubscribe()}
            disabled={loading}
            className="w-full h-[52px] bg-[#059669] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#047857] transition-all shadow-[0_4px_14px_rgba(5,150,105,0.35)] disabled:opacity-60 mb-4"
          >
            {loading
              ? 'Redirecting to Stripe…'
              : promoEligible
                ? `Subscribe — ${selectedPricing.displayPrice}${selectedPricing.period} (50% off)`
                : `Subscribe (${selectedPricing.displayPrice}${selectedPricing.period})`}
          </button>
        )}

        <p className="text-center text-[13px] text-[#667085]">
          {isWeekly
            ? 'Switch plans or cancel anytime in Manage Subscription.'
            : promoEligible
              ? 'First month at 50% off. Then regular price. Cancel anytime.'
              : 'Cancel anytime. No long-term commitment.'}
        </p>
      </div>
    </div>
  );
};

export default UpgradePage;
