import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { NewUserPromoBanner, PromoPriceDisplay } from './PromoPricing';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_NOTE,
  SUBSCRIPTION_TRUST_LINE,
  SUBSCRIPTION_TRUST_LINE_PROMO,
  SUBSCRIPTION_FEATURES,
  PREMIUM_CONTRAST,
  formatPromoPrice,
} from '../constants/subscriptionPlans';
import {
  CREDIT_PACKS,
  CREDIT_PACK_NEVER_EXPIRE,
  ONE_TIME_CONTRAST,
  ONE_TIME_FEATURES,
  ONE_TIME_TRUST_LINE,
} from '../constants/creditPacks';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

function ContrastList({ items }) {
  return (
    <ul className="space-y-2.5 mb-6">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-0.5 w-[16px] h-[16px] rounded-full bg-[#F2F4F7] flex items-center justify-center shrink-0">
            <Check className="w-[10px] h-[10px] text-[#344054]" strokeWidth={3} />
          </span>
          <span className="text-[13px] text-[#475467] leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureList({ items }) {
  return (
    <div className="space-y-2.5 mb-7">
      {items.map((feature) => (
        <div key={feature} className="flex items-start gap-2.5">
          <div className="w-[18px] h-[18px] rounded-full bg-[#101828] flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-[11px] h-[11px] text-white" strokeWidth={3} />
          </div>
          <span className="text-[13px] font-medium text-[#344054] leading-snug">{feature}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Shared Premium vs One-time offer UI for /pricing, /upgrade, and out-of-credits gates.
 * Promo chrome applies only to Premium when promoEligible. Packs are always full price.
 */
export default function PricingPlansSection({
  promoEligible = true,
  highlightPlanKey = null,
  highlightPackKey = null,
  subscriberState = 'none',
  loadingPlanKey = null,
  loadingPackKey = null,
  error = '',
  onSelectPlan,
  onSelectPack,
  onManageSubscription,
  onUpgradeToMonthly,
  heading = 'Choose how you practice',
  subheading = 'Premium refills each period. One-time packs never expire.',
  showHeader = true,
  showPacks = true,
  portalLoading = false,
}) {
  const isWeeklySub = subscriberState === 'weekly';
  const isMonthlySub = subscriberState === 'monthly';
  const anyLoading = Boolean(loadingPlanKey) || Boolean(loadingPackKey) || portalLoading;

  const defaultPlan = highlightPlanKey === 'weekly' ? 'weekly' : 'monthly';
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [selectedPack, setSelectedPack] = useState(
    highlightPackKey === 'boost' ? 'boost' : 'starter',
  );

  const weeklyPricing = formatPromoPrice(WEEKLY, { showPromo: promoEligible && !isWeeklySub && !isMonthlySub });
  const monthlyPricing = formatPromoPrice(MONTHLY, { showPromo: promoEligible && !isWeeklySub && !isMonthlySub });
  const selectedPricing = selectedPlan === 'weekly' ? weeklyPricing : monthlyPricing;
  const selectedPackData = CREDIT_PACKS[selectedPack] || CREDIT_PACKS.starter;

  const handlePremiumCta = () => {
    if (anyLoading) return;
    if (isMonthlySub) {
      onManageSubscription?.();
      return;
    }
    if (isWeeklySub) {
      if (selectedPlan === 'monthly') {
        onUpgradeToMonthly?.();
      } else {
        onManageSubscription?.();
      }
      return;
    }
    onSelectPlan?.(selectedPlan);
  };

  const handlePackCta = () => {
    if (anyLoading || !onSelectPack) return;
    onSelectPack(selectedPack);
  };

  const premiumCtaLabel = (() => {
    if (portalLoading || loadingPlanKey === 'portal') return 'Opening…';
    if (loadingPlanKey && loadingPlanKey !== 'portal') return 'Redirecting to Stripe…';
    if (isMonthlySub) return 'Manage Subscription';
    if (isWeeklySub && selectedPlan === 'monthly') {
      return portalLoading ? 'Opening…' : 'Upgrade to Monthly';
    }
    if (isWeeklySub) return 'Manage Subscription';
    if (promoEligible && selectedPricing.showPromo) {
      return `Subscribe — ${selectedPricing.displayPrice}${selectedPricing.period} (50% off)`;
    }
    return `Subscribe — ${selectedPricing.displayPrice}${selectedPricing.period}`;
  })();

  return (
    <div className="w-full">
      {showHeader && (
        <div className="text-center mb-9 md:mb-11">
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#101828] tracking-tight mb-3">
            {isWeeklySub ? 'Upgrade or top up' : isMonthlySub ? 'Your Premium plan' : heading}
          </h1>
          {!isMonthlySub && (
            <p className="text-[15px] text-[#667085] max-w-[520px] mx-auto leading-relaxed">
              {subheading}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[10px] px-4 py-2.5 mb-6 text-center max-w-[720px] mx-auto">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 max-w-[960px] mx-auto items-stretch">
        {/* Premium */}
        <div className="relative bg-white rounded-[16px] border border-[#D0D5DD] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6 sm:p-7 flex flex-col">
          <div className="absolute -top-3 left-6">
            <span className="inline-flex items-center bg-[#EFF8FF] text-[#175CD3] text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full border border-[#B2DDFF]">
              Recommended
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3 mb-5 mt-1">
            <h2 className="text-[22px] font-bold text-[#101828]">Premium</h2>
            <span className="text-[12px] font-medium text-[#667085]">Subscription</span>
          </div>

          {promoEligible && !isWeeklySub && !isMonthlySub && (
            <NewUserPromoBanner compact />
          )}

          <div className="bg-[#F9FAFB] border border-[#EAECF0] rounded-full px-4 py-2 mb-5 text-center">
            <p className="text-[12px] font-medium text-[#475467] leading-snug">
              {SUBSCRIPTION_PLAN_NOTE}
            </p>
          </div>

          {!isMonthlySub && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { key: 'weekly', label: WEEKLY.name, pricing: weeklyPricing, disabled: isWeeklySub },
                { key: 'monthly', label: MONTHLY.name, pricing: monthlyPricing, disabled: false },
              ].map((opt) => {
                const selected = selectedPlan === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => setSelectedPlan(opt.key)}
                    className={`relative text-left rounded-[12px] p-3.5 border transition-all ${
                      selected
                        ? 'border-[#2E90FA] bg-[#F5FAFF] shadow-[inset_0_0_0_1px_#2E90FA]'
                        : 'border-[#E4E7EC] bg-white hover:border-[#98A2B3]'
                    } ${opt.disabled ? 'opacity-70 cursor-default' : ''}`}
                  >
                    {opt.pricing.showPromo && (
                      <span className="absolute top-0 right-0 bg-[#027A48] text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-bl-[8px] rounded-tr-[11px]">
                        50% OFF
                      </span>
                    )}
                    {opt.disabled && (
                      <span className="absolute top-0 right-0 bg-[#12B76A] text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-bl-[8px] rounded-tr-[11px]">
                        Current
                      </span>
                    )}
                    <p className="text-[11px] font-semibold text-[#667085] mb-1.5">{opt.label}</p>
                    {opt.pricing.showPromo ? (
                      <PromoPriceDisplay
                        originalPrice={opt.pricing.originalPrice}
                        displayPrice={opt.pricing.displayPrice}
                        period={opt.pricing.period}
                        size="md"
                      />
                    ) : (
                      <p className="text-[18px] font-bold text-[#101828]">
                        {opt.pricing.displayPrice}
                        <span className="text-[13px] font-semibold text-[#667085]">
                          {opt.pricing.period}
                        </span>
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {isMonthlySub && (
            <p className="text-[14px] text-[#475467] mb-5 leading-relaxed">
              You&apos;re on Monthly Mastery with {MONTHLY.credits} evaluations each billing period.
              Credits reset on renewal.
            </p>
          )}

          <ContrastList
            items={
              isMonthlySub
                ? PREMIUM_CONTRAST.filter((line) => !line.includes('50%'))
                : promoEligible
                  ? PREMIUM_CONTRAST
                  : PREMIUM_CONTRAST.map((line) =>
                      line.includes('50%') ? 'Full subscription pricing' : line,
                    )
            }
          />

          <FeatureList items={SUBSCRIPTION_FEATURES} />

          <div className="mt-auto">
            <button
              type="button"
              onClick={handlePremiumCta}
              disabled={anyLoading}
              className="w-full h-[50px] rounded-[10px] font-semibold text-[14px] bg-[#101828] text-white hover:bg-[#1D2939] transition-all disabled:opacity-60"
            >
              {premiumCtaLabel}
            </button>
            <p className="text-[11px] text-[#667085] text-center mt-3 leading-relaxed">
              {isMonthlySub || isWeeklySub
                ? 'Manage billing, cancel, or switch plans in the Stripe portal.'
                : promoEligible
                  ? SUBSCRIPTION_TRUST_LINE_PROMO
                  : SUBSCRIPTION_TRUST_LINE}
            </p>
            {isWeeklySub && onManageSubscription && selectedPlan === 'monthly' && (
              <button
                type="button"
                onClick={onManageSubscription}
                disabled={portalLoading}
                className="w-full mt-2 text-[12px] font-semibold text-[#475467] underline hover:text-[#101828] disabled:opacity-60"
              >
                Manage current plan
              </button>
            )}
          </div>
        </div>

        {/* One-time */}
        {showPacks && onSelectPack && (
          <div
            id="one-time-packs"
            className="relative bg-white rounded-[16px] border border-[#E4E7EC] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6 sm:p-7 flex flex-col scroll-mt-24"
          >
            <div className="flex items-baseline justify-between gap-3 mb-5 mt-1">
              <h2 className="text-[22px] font-bold text-[#101828]">One-time purchase</h2>
              <span className="text-[11px] font-semibold text-[#344054] bg-[#F2F4F7] px-2.5 py-1 rounded-md">
                {CREDIT_PACK_NEVER_EXPIRE}
              </span>
            </div>

            <p className="text-[13px] text-[#667085] mb-5 leading-relaxed">
              No renewal. Credits stay after cancelation and never expire.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[CREDIT_PACKS.starter, CREDIT_PACKS.boost].map((pack) => {
                const selected = selectedPack === pack.key;
                return (
                  <button
                    key={pack.key}
                    type="button"
                    onClick={() => setSelectedPack(pack.key)}
                    className={`text-left rounded-[12px] p-3.5 border transition-all ${
                      selected
                        ? 'border-[#344054] bg-[#F9FAFB] shadow-[inset_0_0_0_1px_#344054]'
                        : 'border-[#E4E7EC] bg-white hover:border-[#98A2B3]'
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-[#667085] mb-1">{pack.name}</p>
                    <p className="text-[18px] font-bold text-[#101828]">
                      {pack.price}
                      <span className="text-[12px] font-semibold text-[#667085]"> one-time</span>
                    </p>
                    <p className="text-[12px] text-[#667085] mt-1">{pack.credits} evaluations</p>
                  </button>
                );
              })}
            </div>

            <ContrastList items={ONE_TIME_CONTRAST} />
            <FeatureList items={ONE_TIME_FEATURES} />

            <div className="mt-auto">
              <button
                type="button"
                onClick={handlePackCta}
                disabled={anyLoading || loadingPackKey === selectedPack}
                className="w-full h-[50px] rounded-[10px] font-semibold text-[14px] bg-white text-[#101828] border border-[#D0D5DD] hover:border-[#101828] hover:bg-[#F9FAFB] transition-all disabled:opacity-60"
              >
                {loadingPackKey === selectedPack
                  ? 'Redirecting to Stripe…'
                  : `Buy ${selectedPackData.name} — ${selectedPackData.price}`}
              </button>
              <p className="text-[11px] text-[#667085] text-center mt-3 leading-relaxed">
                {ONE_TIME_TRUST_LINE}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
