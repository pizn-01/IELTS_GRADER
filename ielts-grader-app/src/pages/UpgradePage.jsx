import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import PricingPlansSection from '../components/PricingPlansSection';
import { trackEvent } from '../utils/trackEvent';
import { cancelPathForCheckout, intentBannerForFrom } from '../utils/pricingNav';
import { FULL_PRICE_PLANS } from '../constants/subscriptionPlans';

function normalizePlanKey(value) {
  if (value === 'weekly' || value === 'monthly') return value;
  return null;
}

function normalizePackKey(value) {
  if (value === 'starter' || value === 'boost') return value;
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
  const packFromUrl = normalizePackKey(searchParams.get('pack'));
  const fromParam = searchParams.get('from') || 'upgrade';
  const autoCheckout = searchParams.get('checkout') === '1';
  const autoCheckoutStarted = useRef(false);

  const [loadingPlanKey, setLoadingPlanKey] = useState(
    autoCheckout && !packFromUrl ? (planFromUrl || 'monthly') : null,
  );
  const [loadingPackKey, setLoadingPackKey] = useState(
    autoCheckout && packFromUrl ? packFromUrl : null,
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoNotice, setPromoNotice] = useState('');
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

  const promoEligible = Boolean(status?.promo?.eligible);

  const intentBanner = intentBannerForFrom(fromParam);
  const cancelPath = cancelPathForCheckout();

  const clearCheckoutParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  };

  const redirectToLoginForCheckout = (planKey, packKey) => {
    const params = new URLSearchParams();
    if (packKey) params.set('pack', packKey);
    else params.set('plan', planKey || 'monthly');
    params.set('checkout', '1');
    params.set('from', fromParam);
    navigate('/login', {
      state: {
        authMode: 'login',
        from: {
          pathname: '/upgrade',
          search: `?${params.toString()}`,
        },
      },
    });
  };

  const openBillingPortal = async (flow) => {
    setPortalLoading(true);
    setError('');
    try {
      const { url } = await api.createBillingPortalSession(
        flow === 'subscription_update' ? { flow: 'subscription_update' } : {}
      );
      window.location.href = url;
    } catch (err) {
      if (err.status === 401) {
        redirectToLoginForCheckout(planFromUrl || 'monthly', packFromUrl);
        return;
      }
      setError(err.message || 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (planKey) => {
    if (isSubscribed) {
      setError('You already have an active subscription. Manage it from Your Subscription or billing portal.');
      return;
    }
    setLoadingPlanKey(planKey);
    setError('');
    setPromoNotice('');
    try {
      const { url } = await api.createSubscriptionCheckout(planKey, { cancelPath });
      window.location.href = url;
    } catch (err) {
      if (err.status === 401) {
        redirectToLoginForCheckout(planKey, null);
        return;
      }
      const msg = err.message || 'Something went wrong. Please try again.';
      setError(msg);
      setLoadingPlanKey(null);
      clearCheckoutParams();
    }
  };

  const handleSelectPack = async (packKey) => {
    trackEvent('upgrade_cta_clicked', {
      source: 'upgrade_pack_card',
      pack_key: packKey,
      from: fromParam,
    });
    setLoadingPackKey(packKey);
    setError('');
    try {
      const { url } = await api.createPackCheckout(packKey, { cancelPath });
      window.location.href = url;
    } catch (err) {
      if (err.status === 401) {
        redirectToLoginForCheckout(null, packKey);
        return;
      }
      setError(err.message || 'Something went wrong. Please try again.');
      setLoadingPackKey(null);
    }
  };

  useEffect(() => {
    if (statusLoading || !autoCheckout || autoCheckoutStarted.current) return;
    if (!status) {
      if (error) {
        autoCheckoutStarted.current = true;
        setLoadingPlanKey(null);
        setLoadingPackKey(null);
        clearCheckoutParams();
      }
      return;
    }

    if (packFromUrl) {
      autoCheckoutStarted.current = true;
      handleSelectPack(packFromUrl);
      clearCheckoutParams();
      return;
    }

    if (status.is_subscribed) {
      clearCheckoutParams();
      setLoadingPlanKey(null);
      return;
    }

    // Never auto-redirect to Stripe when the intro offer does not apply —
    // the user may have clicked a promo price on /pricing.
    if (!status.promo?.eligible) {
      autoCheckoutStarted.current = true;
      const planKey = planFromUrl || 'monthly';
      const full = FULL_PRICE_PLANS[planKey];
      setPromoNotice(
        `The intro offer applies to first-time subscribers — your price is ${full?.label || '$15/month'}. Confirm below to continue.`
      );
      setLoadingPlanKey(null);
      clearCheckoutParams();
      return;
    }

    autoCheckoutStarted.current = true;
    handleSubscribe(planFromUrl || 'monthly');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLoading, status, autoCheckout, planFromUrl, packFromUrl, error]);

  const handleSelectPlan = (planKey) => {
    trackEvent('upgrade_cta_clicked', {
      source: 'upgrade_plan_card',
      plan_key: planKey,
      from: fromParam,
    });
    handleSubscribe(planKey);
  };

  const showSpinner = autoCheckout && (loadingPlanKey || loadingPackKey) && !error && !promoNotice;

  if (statusLoading || showSpinner) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <p className="text-[14px] text-gray-400">
          {autoCheckout ? 'Redirecting to Stripe…' : 'Loading plans…'}
        </p>
      </div>
    );
  }

  const showDupSubCta = isSubscribed && /already have an active subscription/i.test(error);

  return (
    <div className="flex flex-col items-center px-4 py-10 md:py-12 bg-[#F8FAFC] min-h-[60vh] -mx-4 sm:mx-0 rounded-[16px]">
      <div className="w-full max-w-[1100px]">
        {intentBanner && (
          <div className="mb-8 text-center max-w-[640px] mx-auto">
            <h2 className="text-[22px] md:text-[26px] font-bold text-[#101828] tracking-tight mb-2">
              {intentBanner.title}
            </h2>
            <p className="text-[14px] md:text-[15px] text-[#667085] leading-relaxed">
              {intentBanner.body}
            </p>
          </div>
        )}
        {promoNotice && (
          <p className="text-[13px] text-[#B54708] bg-[#FFFAEB] border border-[#FEDF89] rounded-[10px] px-4 py-2.5 mb-6 text-center max-w-[720px] mx-auto">
            {promoNotice}
          </p>
        )}
        {showDupSubCta && (
          <div className="mb-6 text-center">
            <button
              type="button"
              onClick={() => openBillingPortal()}
              disabled={portalLoading}
              className="h-10 px-5 rounded-[10px] bg-[#344054] text-white text-[13px] font-semibold hover:bg-[#1D2939] disabled:opacity-60"
            >
              {portalLoading ? 'Opening…' : 'Manage subscription'}
            </button>
          </div>
        )}
        <PricingPlansSection
          promoEligible={promoEligible}
          highlightPlanKey={planFromUrl}
          highlightPackKey={packFromUrl}
          subscriberState={subscriberState}
          loadingPlanKey={loadingPlanKey}
          loadingPackKey={loadingPackKey}
          portalLoading={portalLoading}
          error={error}
          showHeader={!intentBanner}
          onSelectPlan={handleSelectPlan}
          onSelectPack={(key) => handleSelectPack(key)}
          onManageSubscription={() => openBillingPortal()}
          onUpgradeToMonthly={() => openBillingPortal('subscription_update')}
        />
      </div>
    </div>
  );
};

export default UpgradePage;
