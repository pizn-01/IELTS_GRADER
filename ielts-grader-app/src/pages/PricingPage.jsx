import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import SeoHead from '../seo/SeoHead';
import PricingPlansSection from '../components/PricingPlansSection';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { trackEvent } from '../utils/trackEvent';

function normalizePlanKey(value) {
  if (value === 'weekly' || value === 'monthly') return value;
  return null;
}

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const planFromUrl = normalizePlanKey(searchParams.get('plan'));
  const autoCheckout = searchParams.get('checkout') === '1';
  const autoCheckoutStarted = useRef(false);

  const [loadingPlanKey, setLoadingPlanKey] = useState(autoCheckout ? planFromUrl : null);
  const [loadingPackKey, setLoadingPackKey] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      setStatusLoading(false);
      return;
    }
    let cancelled = false;
    setStatusLoading(true);
    api.getSubscriptionStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load subscription status.');
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const isSubscribed = Boolean(status?.is_subscribed || user?.is_subscribed);
  const currentPlan = status?.subscription_plan || user?.subscription_plan;
  const subscriberState = isSubscribed
    ? (currentPlan === 'monthly' ? 'monthly' : currentPlan === 'weekly' ? 'weekly' : 'none')
    : 'none';

  const promoEligible = !isAuthenticated
    ? true
    : status
      ? Boolean(status.promo?.eligible) || (!status.has_paid && !isSubscribed)
      : Boolean(!user?.has_paid && !isSubscribed);

  const clearCheckoutParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    next.delete('pack');
    setSearchParams(next, { replace: true });
  };

  const startCheckout = async (planKey) => {
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

  const startPackCheckout = async (packKey) => {
    setLoadingPackKey(packKey);
    setError('');
    try {
      const { url } = await api.createPackCheckout(packKey);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoadingPackKey(null);
    }
  };

  const requestAuthForCheckout = (planKey) => {
    navigate('/login', {
      state: {
        authMode: 'signup',
        from: {
          pathname: '/pricing',
          search: `?plan=${planKey}&checkout=1`,
        },
      },
    });
  };

  const requestAuthForPack = (packKey) => {
    navigate('/login', {
      state: {
        authMode: 'signup',
        from: {
          pathname: '/pricing',
          search: `?pack=${packKey}&checkout=1`,
        },
      },
    });
  };

  const handleSelectPlan = (planKey) => {
    trackEvent('upgrade_cta_clicked', {
      source: 'pricing_plan_card',
      plan_key: planKey,
    });

    if (authLoading) return;

    if (!isAuthenticated) {
      requestAuthForCheckout(planKey);
      return;
    }

    if (isSubscribed) {
      navigate('/upgrade');
      return;
    }

    startCheckout(planKey);
  };

  const handleSelectPack = (packKey) => {
    trackEvent('upgrade_cta_clicked', {
      source: 'pricing_pack_card',
      pack_key: packKey,
    });

    if (authLoading) return;

    if (!isAuthenticated) {
      requestAuthForPack(packKey);
      return;
    }

    startPackCheckout(packKey);
  };

  const handleSelectFree = () => {
    navigate(isAuthenticated ? '/dashboard' : '/report');
  };

  // Deep-link: /pricing?plan=monthly&checkout=1 or ?pack=starter&checkout=1 after auth
  useEffect(() => {
    if (authLoading || statusLoading || !autoCheckout || autoCheckoutStarted.current) return;
    const packFromUrl = searchParams.get('pack');
    if (!isAuthenticated) {
      autoCheckoutStarted.current = true;
      if (packFromUrl === 'starter' || packFromUrl === 'boost') {
        requestAuthForPack(packFromUrl);
      } else {
        requestAuthForCheckout(planFromUrl || 'monthly');
      }
      return;
    }
    if (packFromUrl === 'starter' || packFromUrl === 'boost') {
      autoCheckoutStarted.current = true;
      startPackCheckout(packFromUrl);
      clearCheckoutParams();
      return;
    }
    if (status?.is_subscribed) {
      clearCheckoutParams();
      setLoadingPlanKey(null);
      return;
    }
    if (!status && error) {
      autoCheckoutStarted.current = true;
      setLoadingPlanKey(null);
      clearCheckoutParams();
      return;
    }
    if (!status) return;

    autoCheckoutStarted.current = true;
    const planKey = planFromUrl || 'monthly';
    startCheckout(planKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, statusLoading, status, autoCheckout, planFromUrl, isAuthenticated, error, searchParams]);

  const openBillingPortal = async (flow) => {
    setLoadingPlanKey(flow === 'subscription_update' ? 'monthly' : 'portal');
    setError('');
    try {
      const { url } = await api.createBillingPortalSession(
        flow === 'subscription_update' ? { flow: 'subscription_update' } : {}
      );
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to open billing portal.');
      setLoadingPlanKey(null);
    }
  };

  const showCheckoutSpinner = autoCheckout && (loadingPlanKey || loadingPackKey) && !error;

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <SeoHead
        title="IELTS Writing Practice Plans & Pricing | IELTS AI Tutor"
        description="New users get 50% off the first month. Start free with two full IELTS writing evaluations, then upgrade to Weekly Sprint or Monthly Mastery."
        path="/pricing"
      />
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-6 py-12 md:px-[60px] md:py-[80px]">
        {showCheckoutSpinner || (isAuthenticated && statusLoading && autoCheckout) ? (
          <div className="flex flex-col items-center py-16">
            <p className="text-[14px] text-gray-400">Redirecting to Stripe…</p>
          </div>
        ) : (
          <PricingPlansSection
            promoEligible={promoEligible}
            showFreeCard={subscriberState === 'none'}
            highlightPlanKey={planFromUrl}
            subscriberState={subscriberState}
            loadingPlanKey={loadingPlanKey === 'portal' ? null : loadingPlanKey}
            loadingPackKey={loadingPackKey}
            portalLoading={
              loadingPlanKey === 'portal'
              || (loadingPlanKey === 'monthly' && subscriberState === 'weekly')
            }
            error={error}
            onSelectFree={handleSelectFree}
            onSelectPlan={handleSelectPlan}
            onSelectPack={handleSelectPack}
            onManageSubscription={() => openBillingPortal()}
            onUpgradeToMonthly={() => openBillingPortal('subscription_update')}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
