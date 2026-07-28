import React from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import SeoHead from '../seo/SeoHead';
import { NewUserPromoBanner, PromoPriceDisplay } from '../components/PromoPricing';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_NOTE, formatPromoPrice } from '../constants/subscriptionPlans';
import { trackEvent } from '../utils/trackEvent';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

const PricingPage = () => {
  const navigate = useNavigate();

  const weeklyPromo = formatPromoPrice(WEEKLY, { showPromo: true });
  const monthlyPromo = formatPromoPrice(MONTHLY, { showPromo: true });

  const plans = [
    {
      name: 'Free Trial',
      price: '$0',
      description: 'Get started with your first evaluation.',
      features: [
        '2 free full evaluations',
        'Band score breakdown',
        'Fix cards & feedback',
        'No card required',
      ],
      buttonText: 'Start Free',
      isPremium: false,
    },
    {
      name: 'Weekly Sprint',
      planKey: WEEKLY.key,
      price: weeklyPromo.displayPrice,
      originalPrice: weeklyPromo.originalPrice,
      promoBadge: weeklyPromo.badge,
      period: WEEKLY.period,
      description: 'Intensive practice for fast results.',
      features: [
        '20 evaluations per week',
        'Detailed fix cards',
        'All task types',
        'Priority support',
      ],
      buttonText: 'Get Sprint — 50% off',
      isPremium: true,
    },
    {
      name: 'Monthly Mastery',
      planKey: MONTHLY.key,
      price: monthlyPromo.displayPrice,
      originalPrice: monthlyPromo.originalPrice,
      promoBadge: monthlyPromo.badge,
      period: MONTHLY.period,
      description: 'Best value for serious prep.',
      features: [
        '80 evaluations per month',
        'Comprehensive reports',
        'Personalized learning guides',
        '25% less per exam vs weekly',
      ],
      buttonText: 'Get Monthly — 50% off',
      isPremium: true,
      highlight: 'Best Value',
    },
  ];

  const handlePlanClick = (plan) => {
    if (!plan.isPremium) {
      navigate('/report');
      return;
    }
    trackEvent('upgrade_cta_clicked', {
      source: 'pricing_plan_card',
      plan: plan.name,
      plan_key: plan.planKey,
    });
    navigate(`/upgrade?plan=${plan.planKey}&checkout=1`);
  };

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <SeoHead
        title="IELTS Writing Practice Plans & Pricing | IELTS AI Tutor"
        description="New users get 50% off the first month. Start free with two full IELTS writing evaluations, then upgrade to Weekly Sprint or Monthly Mastery."
        path="/pricing"
      />
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-6 py-12 md:px-[60px] md:py-[80px]">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#1a1f36] mb-3 md:mb-4">
            Choose Your Path to Success
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#6B7280] mb-5">
            Select the plan that fits your IELTS preparation goals.
          </p>
          <NewUserPromoBanner />
          <p className="inline-block text-[13px] md:text-[14px] font-medium text-[#475467] bg-white border border-[#E5E7EB] rounded-full px-4 py-2 shadow-sm">
            {SUBSCRIPTION_PLAN_NOTE}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-[1100px] mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`bg-white rounded-[16px] p-6 md:p-8 border-2 transition-all hover:shadow-xl flex flex-col ${
                plan.highlight
                  ? 'border-[#3B82F6] relative shadow-lg md:scale-105 z-10 mt-4 md:mt-0'
                  : plan.isPremium
                    ? 'border-[#6EE7B7] relative shadow-md'
                    : 'border-[#E5E7EB]'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                  {plan.highlight}
                </span>
              )}
              {plan.isPremium && (
                <span className="absolute -top-3 right-4 bg-[#059669] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
                  50% OFF
                </span>
              )}

              <div className="mb-8">
                <h3 className="text-[20px] font-bold text-[#1a1f36] mb-3">{plan.name}</h3>
                {plan.originalPrice ? (
                  <div className="mb-3">
                    <PromoPriceDisplay
                      originalPrice={plan.originalPrice}
                      displayPrice={plan.price}
                      period={plan.period}
                      size="lg"
                    />
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[42px] font-extrabold text-[#1a1f36]">{plan.price}</span>
                  </div>
                )}
                <p className="text-[14px] text-[#6B7280]">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#10B981]" strokeWidth={3} />
                    </div>
                    <span className="text-[14px] text-[#374151] leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handlePlanClick(plan)}
                className={`w-full h-[50px] rounded-[10px] font-bold text-[15px] transition-all mt-auto ${
                  plan.isPremium
                    ? 'bg-[#059669] text-white hover:bg-[#047857] shadow-[0_4px_14px_rgba(5,150,105,0.4)]'
                    : 'bg-white text-[#1a1f36] border border-[#E5E7EB] hover:border-[#1a1f36]'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
