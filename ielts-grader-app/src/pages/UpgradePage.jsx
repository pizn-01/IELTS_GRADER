import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import PricingPlansSection from '../components/PricingPlansSection';
import { trackEvent } from '../utils/trackEvent';

function normalizePlanKey(value) {
  if (value === 'weekly' || value === 'monthly') return value;
  return null;
}

/**
 * Authenticated pricing / checkout surface.
 * Offer UI matches /pricing via PricingPlansSection; handles Stripe + billing portal.
 */
const UpgradePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planFromUrl = normalizePlanKey(searchParams.get('plan'));
  const autoCheckout = searchParams.get('checkout') === '1';
  const autoCheckoutStarted = useRef(false);

  const [loadingPlanKey, setLoadingPlanKey] = useState(autoCheckout ? (planFromUrl || 'monthly') : null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    api.getSubscriptionStatus()
      .then((data) => setStatus(data))
      .catch((err) => setError(err.message))
      .finally(() => setStatusLoading(false));
  }, []);

  const currentPlan = status?.subscription_plan;
  const isSubscribed = status?.is_subscribed;
  const subscriberState = isSubscribed
    ? (currentPlan === 'monthly' ? 'monthly' : currentPlan === 'weekly' ? 'weekly' : 'none')
    : 'none';

  const promoEligible = status
    ? Boolean(status.promo?.eligible) || (!status.has_paid && !isSubscribed)
    : false;

  const clearCheckoutParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  };

  const handleSubscribe = async (planKey) => {
    if (isSubscribed) return;
    setLoadingPlanKey(planKey);
    setError('');
    try {
      const { url } = await api.createSubscriptionCheckout(planKey);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoadingPlanKey(null);
      clearCheckoutParams();
    }
  };

  useEffect(() => {
    if (statusLoading || !autoCheckout || autoCheckoutStarted.current) return;
    if (!status) {
      if (error) {
        autoCheckoutStarted.current = true;
        setLoadingPlanKey(null);
        clearCheckoutParams();
      }
      return;
    }
    if (status.is_subscribed) {
      clearCheckoutParams();
      setLoadingPlanKey(null);
      return;
    }
    autoCheckoutStarted.current = true;
    handleSubscribe(planFromUrl || 'monthly');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLoading, status, autoCheckout, planFromUrl, error]);

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

  const handleSelectPlan = (planKey) => {
    trackEvent('upgrade_cta_clicked', {
      source: 'upgrade_plan_card',
      plan_key: planKey,
    });
    handleSubscribe(planKey);
  };

  if (statusLoading || (autoCheckout && loadingPlanKey && !error)) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <p className="text-[14px] text-gray-400">
          {autoCheckout ? 'Redirecting to Stripe…' : 'Loading plans…'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-10 md:py-12 bg-[#EFF6FF] min-h-[60vh] -mx-4 sm:mx-0 rounded-[16px]">
      <div className="w-full max-w-[1200px]">
        <PricingPlansSection
          promoEligible={promoEligible}
          showFreeCard={subscriberState === 'none'}
          highlightPlanKey={planFromUrl}
          subscriberState={subscriberState}
          loadingPlanKey={loadingPlanKey}
          portalLoading={portalLoading}
          error={error}
          onSelectFree={() => navigate('/dashboard')}
          onSelectPlan={handleSelectPlan}
          onManageSubscription={() => openBillingPortal()}
          onUpgradeToMonthly={() => openBillingPortal('subscription_update')}
        />
      </div>
    </div>
  );
};

export default UpgradePage;
