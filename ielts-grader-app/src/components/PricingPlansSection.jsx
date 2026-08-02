import React from 'react';
import { Check } from 'lucide-react';
import { NewUserPromoBanner, PromoPriceDisplay } from './PromoPricing';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_NOTE,
  SUBSCRIPTION_TRUST_LINE,
  SUBSCRIPTION_TRUST_LINE_PROMO,
  formatPromoPrice,
} from '../constants/subscriptionPlans';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

const FREE_FEATURES = [
  '2 free full evaluations',
  'Band score breakdown',
  'Fix cards & feedback',
  'No card required',
];

const WEEKLY_FEATURES = [
  '20 evaluations per week',
  'Detailed fix cards',
  'All task types',
  'Priority support',
];

const MONTHLY_FEATURES = [
  '80 evaluations per month',
  'Comprehensive reports',
  'Personalized learning guides',
  '25% less per exam vs weekly',
];

/**
 * Shared Free / Weekly / Monthly offer UI for /pricing and /upgrade.
 */
export default function PricingPlansSection({
  promoEligible = true,
  showFreeCard = true,
  highlightPlanKey = null,
  subscriberState = 'none',
  loadingPlanKey = null,
  error = '',
  onSelectFree,
  onSelectPlan,
  onManageSubscription,
  onUpgradeToMonthly,
  heading = 'Choose Your Path to Success',
  subheading = 'Select the plan that fits your IELTS preparation goals.',
  showHeader = true,
  portalLoading = false,
}) {
  const weeklyPricing = formatPromoPrice(WEEKLY, { showPromo: promoEligible });
  const monthlyPricing = formatPromoPrice(MONTHLY, { showPromo: promoEligible });
  const monthlyFull = formatPromoPrice(MONTHLY, { showPromo: false });
  const isWeeklySub = subscriberState === 'weekly';
  const isMonthlySub = subscriberState === 'monthly';
  const anyLoading = Boolean(loadingPlanKey) || portalLoading;

  if (isMonthlySub) {
    return (
      <div className="w-full max-w-[560px] mx-auto text-center">
        {showHeader && (
          <div className="mb-8">
            <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#1a1f36] mb-3">
              You&apos;re on Monthly Mastery
            </h1>
            <p className="text-[14px] md:text-[16px] text-[#6B7280]">
              You have an active monthly subscription with {MONTHLY.credits} evaluations per month.
            </p>
          </div>
        )}
        <div className="bg-white rounded-[16px] p-6 md:p-8 border-2 border-[#E5E7EB] shadow-sm">
          {error && (
            <p className="text-[13px] text-[#EA4335] bg-red-50 rounded-[8px] px-4 py-2.5 mb-4">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onManageSubscription}
            disabled={portalLoading}
            className="w-full h-[50px] rounded-[10px] font-bold text-[15px] bg-[#101828] text-white hover:bg-[#1D2939] transition-all disabled:opacity-60"
          >
            {portalLoading ? 'Opening…' : 'Manage Subscription'}
          </button>
          <p className="text-[13px] text-[#667085] mt-4">
            Cancel, switch plans, or update payment in the billing portal.
          </p>
        </div>
      </div>
    );
  }

  const plans = [
    showFreeCard && !isWeeklySub
      ? {
          key: 'free',
          name: 'Free Trial',
          price: '$0',
          description: 'Get started with your first evaluation.',
          features: FREE_FEATURES,
          buttonText: 'Start Free',
          isPremium: false,
        }
      : null,
    {
      key: WEEKLY.key,
      name: WEEKLY.name,
      pricing: weeklyPricing,
      description: 'Intensive practice for fast results.',
      features: WEEKLY_FEATURES,
      buttonText: isWeeklySub
        ? 'Current plan'
        : weeklyPricing.showPromo
          ? 'Get Sprint — 50% off'
          : 'Get Sprint',
      isPremium: true,
      isCurrent: isWeeklySub,
      disabled: isWeeklySub,
    },
    {
      key: MONTHLY.key,
      name: MONTHLY.name,
      pricing: monthlyPricing,
      description: 'Best value for serious prep.',
      features: MONTHLY_FEATURES,
      buttonText: isWeeklySub
        ? portalLoading
          ? 'Opening…'
          : `Upgrade to Monthly (${monthlyFull.displayPrice}${monthlyFull.period})`
        : monthlyPricing.showPromo
          ? 'Get Monthly — 50% off'
          : 'Get Monthly',
      isPremium: true,
      highlight: 'Best Value',
      emphasized: highlightPlanKey === 'monthly' || (!highlightPlanKey && !isWeeklySub),
    },
  ].filter(Boolean);

  const handleClick = (plan) => {
    if (plan.disabled || anyLoading) return;
    if (!plan.isPremium) {
      onSelectFree?.();
      return;
    }
    if (isWeeklySub && plan.key === 'monthly') {
      onUpgradeToMonthly?.();
      return;
    }
    onSelectPlan?.(plan.key);
  };

  return (
    <div className="w-full">
      {showHeader && (
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#1a1f36] mb-3 md:mb-4">
            {isWeeklySub ? 'Upgrade Your Plan' : heading}
          </h1>
          {!isWeeklySub && (
            <p className="text-[14px] md:text-[16px] text-[#6B7280] mb-5">{subheading}</p>
          )}
          {promoEligible && !isWeeklySub && <NewUserPromoBanner />}
          <p className="inline-block text-[13px] md:text-[14px] font-medium text-[#475467] bg-white border border-[#E5E7EB] rounded-full px-4 py-2 shadow-sm">
            {SUBSCRIPTION_PLAN_NOTE}
          </p>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#EA4335] bg-red-50 rounded-[8px] px-4 py-2.5 mb-6 text-center max-w-[640px] mx-auto">
          {error}
        </p>
      )}

      <div
        className={`grid grid-cols-1 gap-6 md:gap-8 max-w-[1100px] mx-auto ${
          plans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-[720px]'
        }`}
      >
        {plans.map((plan) => {
          const isHighlighted = Boolean(plan.highlight) && !plan.isCurrent;
          const isLoading = loadingPlanKey === plan.key || (isWeeklySub && plan.key === 'monthly' && portalLoading);
          return (
            <div
              key={plan.key}
              className={`bg-white rounded-[16px] p-6 md:p-8 border-2 transition-all hover:shadow-xl flex flex-col ${
                isHighlighted
                  ? 'border-[#3B82F6] relative shadow-lg md:scale-105 z-10 mt-4 md:mt-0'
                  : plan.isPremium
                    ? 'border-[#6EE7B7] relative shadow-md'
                    : 'border-[#E5E7EB]'
              } ${plan.isCurrent ? 'opacity-90' : ''} ${
                plan.emphasized && !isHighlighted ? 'ring-2 ring-[#059669]/20' : ''
              }`}
            >
              {plan.highlight && !plan.isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                  {plan.highlight}
                </span>
              )}
              {plan.isPremium && plan.pricing?.showPromo && !plan.isCurrent && (
                <span className="absolute -top-3 right-4 bg-[#059669] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
                  50% OFF
                </span>
              )}
              {plan.isCurrent && (
                <span className="absolute -top-3 right-4 bg-[#12B76A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                  Current
                </span>
              )}

              <div className="mb-8">
                <h3 className="text-[20px] font-bold text-[#1a1f36] mb-3">{plan.name}</h3>
                {plan.pricing?.showPromo ? (
                  <div className="mb-3">
                    <PromoPriceDisplay
                      originalPrice={plan.pricing.originalPrice}
                      displayPrice={plan.pricing.displayPrice}
                      period={plan.pricing.period}
                      size="lg"
                    />
                  </div>
                ) : plan.pricing ? (
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[42px] font-extrabold text-[#1a1f36]">
                      {plan.pricing.displayPrice}
                    </span>
                    <span className="text-[16px] font-semibold text-[#6B7280]">
                      {plan.pricing.period}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-[42px] font-extrabold text-[#1a1f36]">{plan.price}</span>
                  </div>
                )}
                <p className="text-[14px] text-[#6B7280]">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#10B981]" strokeWidth={3} />
                    </div>
                    <span className="text-[14px] text-[#374151] leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleClick(plan)}
                disabled={plan.disabled || isLoading || anyLoading}
                className={`w-full h-[50px] rounded-[10px] font-bold text-[15px] transition-all mt-auto disabled:opacity-60 ${
                  plan.isPremium && !plan.isCurrent
                    ? 'bg-[#059669] text-white hover:bg-[#047857] shadow-[0_4px_14px_rgba(5,150,105,0.4)]'
                    : 'bg-white text-[#1a1f36] border border-[#E5E7EB] hover:border-[#1a1f36]'
                }`}
              >
                {isLoading && plan.isPremium && !plan.isCurrent
                  ? 'Redirecting to Stripe…'
                  : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {!isMonthlySub && (
        <p className="text-center text-[13px] text-[#667085] mt-8 max-w-[640px] mx-auto">
          {isWeeklySub
            ? 'Switch plans or cancel anytime in Manage Subscription.'
            : promoEligible
              ? SUBSCRIPTION_TRUST_LINE_PROMO
              : SUBSCRIPTION_TRUST_LINE}
        </p>
      )}

      {isWeeklySub && onManageSubscription && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onManageSubscription}
            disabled={portalLoading}
            className="text-[13px] font-semibold text-[#475467] underline hover:text-[#101828] disabled:opacity-60"
          >
            {portalLoading ? 'Opening…' : 'Manage Subscription'}
          </button>
        </div>
      )}
    </div>
  );
}
