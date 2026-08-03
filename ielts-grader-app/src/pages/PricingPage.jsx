import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import SeoHead from '../seo/SeoHead';
import PricingPlansSection from '../components/PricingPlansSection';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/trackEvent';
import { buildUpgradeShopPath } from '../utils/pricingNav';

function normalizePlanKey(value) {
  if (value === 'weekly' || value === 'monthly') return value;
  return null;
}

function normalizePackKey(value) {
  if (value === 'starter' || value === 'boost') return value;
  return null;
}

/**
 * Public marketing shop. Logged-in users are redirected to /upgrade
 * (including post-auth checkout resume).
 */
const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const planFromUrl = normalizePlanKey(searchParams.get('plan'));
  const packFromUrl = normalizePackKey(searchParams.get('pack'));
  const autoCheckout = searchParams.get('checkout') === '1';
  const fromParam = searchParams.get('from') || 'upgrade';

  // Authenticated → in-app shop (preserve plan/pack/checkout/from)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    navigate(
      buildUpgradeShopPath({
        from: fromParam === 'out_of_credits' || fromParam === 'report' || fromParam === 'upgrade'
          ? fromParam
          : 'upgrade',
        plan: planFromUrl || 'monthly',
        pack: packFromUrl,
        checkout: autoCheckout,
      }),
      { replace: true },
    );
  }, [authLoading, isAuthenticated, navigate, planFromUrl, packFromUrl, autoCheckout, fromParam]);

  const requestAuthForCheckout = (planKey) => {
    navigate('/login', {
      state: {
        authMode: 'signup',
        from: {
          pathname: '/upgrade',
          search: `?plan=${planKey}&checkout=1&from=upgrade`,
        },
      },
    });
  };

  const requestAuthForPack = (packKey) => {
    navigate('/login', {
      state: {
        authMode: 'signup',
        from: {
          pathname: '/upgrade',
          search: `?pack=${packKey}&checkout=1&from=upgrade`,
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
    requestAuthForCheckout(planKey);
  };

  const handleSelectPack = (packKey) => {
    trackEvent('upgrade_cta_clicked', {
      source: 'pricing_pack_card',
      pack_key: packKey,
    });
    if (authLoading) return;
    requestAuthForPack(packKey);
  };

  // Deep-link checkout while logged out → auth → /upgrade resume
  useEffect(() => {
    if (authLoading || isAuthenticated || !autoCheckout) return;
    if (packFromUrl) {
      requestAuthForPack(packFromUrl);
    } else {
      requestAuthForCheckout(planFromUrl || 'monthly');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, autoCheckout, planFromUrl, packFromUrl]);

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[14px] text-gray-400">
          {isAuthenticated ? 'Taking you to plans…' : 'Loading…'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SeoHead
        title="IELTS Writing Practice Plans & Pricing | IELTS AI Tutor"
        description="Choose Premium (Weekly or Monthly) or a one-time credit pack. New users get 50% off the first month of Premium."
        path="/pricing"
      />
      <Navbar />

      <main className="max-w-[1100px] mx-auto px-5 py-12 md:px-10 md:py-16">
        <PricingPlansSection
          promoEligible
          highlightPlanKey={planFromUrl}
          highlightPackKey={packFromUrl}
          subscriberState="none"
          onSelectPlan={handleSelectPlan}
          onSelectPack={handleSelectPack}
        />
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
