import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import { trackEvent } from '../utils/trackEvent';
import { goToUpgradeShop } from '../utils/pricingNav';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

export const NotificationBanner = ({ isOpen, onClose, credits = null }) => {
  const navigate = useNavigate();
  // Only show when explicitly open and the user is fully out of evaluations.
  if (!isOpen || credits !== 0) return null;
  const message = `You've used all your evaluations. Choose Premium (Weekly ${WEEKLY.label} / Monthly ${MONTHLY.label}) or a one-time pack that never expires.`;

  return (
    <div className="bg-[#EFF8FF]/80 border border-[#B2DDFF] rounded-[16px] px-4 md:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-5 h-5 border border-[#1A96F3] rounded-full flex items-center justify-center text-[#1A96F3] text-[10px] font-black shrink-0 mt-0.5 sm:mt-0">
          i
        </div>
        <p className="text-[14px] text-[#175CD3] font-medium leading-snug">
          {message}
        </p>
      </div>
      <button
        onClick={() => {
          trackEvent('upgrade_cta_clicked', { source: 'notification_banner' });
          goToUpgradeShop({ navigate, from: 'out_of_credits', plan: 'monthly' });
        }}
        className="bg-[#2C3E50] text-white w-full sm:w-auto px-5 h-[34px] rounded-[10px] text-[12px] font-semibold hover:bg-[#1D2939] transition-all flex items-center justify-center whitespace-nowrap shrink-0"
      >
        View plans
      </button>
    </div>
  );
};
