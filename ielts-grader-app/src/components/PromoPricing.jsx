import React from 'react';
import { Percent } from 'lucide-react';
import { NEW_USER_PROMO } from '../constants/subscriptionPlans';

/** Bold campaign banner for pricing / upgrade surfaces. */
export function NewUserPromoBanner({ compact = false }) {
  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] px-4 py-3 mb-5 text-center shadow-[0_8px_24px_rgba(16,185,129,0.35)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/90">
          New user offer
        </p>
        <p className="text-[18px] font-extrabold text-white leading-tight">
          50% OFF first month
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] px-5 py-4 md:px-8 md:py-5 mb-8 md:mb-10 text-center shadow-[0_12px_40px_rgba(16,185,129,0.35)]">
      <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/10" aria-hidden />
      <div className="absolute -right-4 -bottom-8 w-28 h-28 rounded-full bg-white/10" aria-hidden />
      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white shrink-0">
          <Percent className="w-5 h-5" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-[12px] md:text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-100">
            Limited new-user offer
          </p>
          <p className="text-[22px] md:text-[28px] font-extrabold text-white leading-tight">
            {NEW_USER_PROMO.percentOff}% off your first month
          </p>
          <p className="text-[13px] md:text-[14px] font-medium text-emerald-50 mt-0.5">
            Weekly from $2.50 · Monthly from $7.50 · Then regular price
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Sale price with loud strikethrough + SAVE badge.
 * @param {{ originalPrice: string, displayPrice: string, period?: string, size?: 'lg' | 'md', planKey?: 'weekly' | 'monthly' }} props
 */
export function PromoPriceDisplay({ originalPrice, displayPrice, period, size = 'lg', planKey = 'monthly' }) {
  const isLg = size === 'lg';
  const durationLabel = planKey === 'weekly' ? 'First 4 weeks' : 'First month only';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center bg-[#FEF3C7] text-[#B45309] text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md">
          Save {NEW_USER_PROMO.percentOff}%
        </span>
        <span className="text-[12px] font-semibold text-[#059669]">
          {durationLabel}
        </span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-semibold text-[#9CA3AF] line-through decoration-2 ${
            isLg ? 'text-[20px] md:text-[24px]' : 'text-[14px]'
          }`}
        >
          {originalPrice}
        </span>
        <span
          className={`font-extrabold text-[#059669] tracking-tight ${
            isLg ? 'text-[42px] md:text-[46px] leading-none' : 'text-[22px] leading-none'
          }`}
        >
          {displayPrice}
        </span>
        {period && (
          <span className={`font-semibold text-[#6B7280] ${isLg ? 'text-[16px]' : 'text-[13px]'}`}>
            {period}
          </span>
        )}
      </div>
    </div>
  );
}

export default NewUserPromoBanner;
