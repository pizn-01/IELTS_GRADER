import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { PromoPriceDisplay } from './PromoPricing';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_TRUST_LINE,
  SUBSCRIPTION_TRUST_LINE_PROMO,
  SUBSCRIPTION_FEATURES,
  formatPromoPrice,
  PLAN_PER_EVAL,
  PACK_PER_EVAL,
  PRICING_PAYMENT_TRUST,
} from '../constants/subscriptionPlans';
import {
  CREDIT_PACKS,
  CREDIT_PACK_NEVER_EXPIRE,
  ONE_TIME_BULLETS,
  ONE_TIME_TRUST_LINE,
} from '../constants/creditPacks';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

function BulletList({ items, tone = 'premium' }) {
  const iconClass =
    tone === 'premium'
      ? 'bg-[#1A96F3] text-white'
      : 'bg-[#0D9488] text-white';
  return (
    <ul className="space-y-2.5 mb-6 flex-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 ${iconClass}`}
          >
            <Check className="w-[11px] h-[11px]" strokeWidth={3} />
          </span>
          <span className="text-[13px] font-medium text-[#344054] leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Shared Premium vs One-time offer UI for /pricing and /upgrade.
 * Promo shows on plan price chips / CTA only (no tall banner chrome).
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
    if (portalLoading) return 'Opening…';
    if (loadingPlanKey) return 'Redirecting to Stripe…';
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
        <div className="text-center mb-8">
          <h1 className="text-[22px] md:text-[26px] font-bold text-[#101828] tracking-tight mb-2">
            {isWeeklySub ? 'Upgrade or top up' : isMonthlySub ? 'Your Premium plan' : heading}
          </h1>
          {!isMonthlySub && (
            <p className="text-[14px] md:text-[15px] text-[#667085] max-w-[640px] mx-auto leading-relaxed">
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
        <div className="relative flex flex-col rounded-[16px] border border-[#B2DDFF] bg-gradient-to-b from-[#F0F9FF] to-white p-6 sm:p-7 shadow-[0_8px_24px_rgba(26,150,243,0.12)]">
          <div className="absolute -top-3 left-6">
            <span className="inline-flex items-center bg-[#1A96F3] text-white text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full shadow-sm">
              Recommended
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3 mb-5 mt-1">
            <h2 className="text-[22px] font-bold text-[#101828]">Premium</h2>
            <span className="text-[11px] font-semibold text-[#175CD3] bg-[#EFF8FF] px-2.5 py-1 rounded-md border border-[#B2DDFF]">
              Subscription
            </span>
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
                        ? 'border-[#1A96F3] bg-white shadow-[inset_0_0_0_1px_#1A96F3,0_4px_12px_rgba(26,150,243,0.15)]'
                        : 'border-[#E4E7EC] bg-white/80 hover:border-[#7CD4FD]'
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
                        planKey={opt.key}
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
                    <p className="text-[11px] font-medium text-[#175CD3] mt-1.5">
                      {PLAN_PER_EVAL[opt.key]}
                    </p>
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

          <BulletList items={SUBSCRIPTION_FEATURES} tone="premium" />

          <div className="mt-auto pt-1">
            <button
              type="button"
              onClick={handlePremiumCta}
              disabled={anyLoading}
              className="w-full h-[50px] rounded-[10px] font-semibold text-[14px] bg-[#1A96F3] text-white hover:bg-[#1570CD] shadow-[0_4px_14px_rgba(26,150,243,0.35)] transition-all disabled:opacity-60"
            >
              {premiumCtaLabel}
            </button>
            <p className="text-[11px] text-[#667085] text-center mt-3 leading-relaxed min-h-[32px]">
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
                className="w-full mt-2 text-[12px] font-semibold text-[#175CD3] underline hover:text-[#0B4A9E] disabled:opacity-60"
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
            className="relative flex flex-col rounded-[16px] border border-[#99F6E4] bg-gradient-to-b from-[#F0FDFA] to-white p-6 sm:p-7 shadow-[0_8px_24px_rgba(13,148,136,0.10)] scroll-mt-24"
          >
            <div className="flex items-baseline justify-between gap-3 mb-5 mt-1">
              <h2 className="text-[22px] font-bold text-[#101828]">One-time purchase</h2>
              <span className="text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-1 rounded-md border border-[#99F6E4]">
                {CREDIT_PACK_NEVER_EXPIRE}
              </span>
            </div>

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
                        ? 'border-[#0D9488] bg-white shadow-[inset_0_0_0_1px_#0D9488,0_4px_12px_rgba(13,148,136,0.15)]'
                        : 'border-[#E4E7EC] bg-white/80 hover:border-[#5EEAD4]'
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-[#667085] mb-1">{pack.name}</p>
                    <p className="text-[18px] font-bold text-[#101828]">
                      {pack.price}
                      <span className="text-[12px] font-semibold text-[#667085]"> one-time</span>
                    </p>
                    <p className="text-[12px] text-[#0F766E] font-medium mt-1">{pack.credits} evaluations</p>
                    <p className="text-[11px] font-medium text-[#0F766E] mt-1">
                      {PACK_PER_EVAL[pack.key]}
                    </p>
                  </button>
                );
              })}
            </div>

            <BulletList items={ONE_TIME_BULLETS} tone="pack" />

            <div className="mt-auto pt-1">
              <button
                type="button"
                onClick={handlePackCta}
                disabled={anyLoading || loadingPackKey === selectedPack}
                className="w-full h-[50px] rounded-[10px] font-semibold text-[14px] bg-[#0D9488] text-white hover:bg-[#0F766E] shadow-[0_4px_14px_rgba(13,148,136,0.3)] transition-all disabled:opacity-60"
              >
                {loadingPackKey === selectedPack
                  ? 'Redirecting to Stripe…'
                  : `Buy ${selectedPackData.name} — ${selectedPackData.price}`}
              </button>
              <p className="text-[11px] text-[#667085] text-center mt-3 leading-relaxed min-h-[32px]">
                {ONE_TIME_TRUST_LINE}
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="text-[12px] text-[#667085] text-center mt-6 max-w-[720px] mx-auto leading-relaxed">
        {PRICING_PAYMENT_TRUST}
      </p>
    </div>
  );
}
