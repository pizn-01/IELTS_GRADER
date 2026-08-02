import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBSCRIPTION_PLANS, FREE_TRIAL_CREDITS } from '../constants/subscriptionPlans';
import { trackEvent } from '../utils/trackEvent';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

export const NotificationBanner = ({ isOpen, onClose, credits = null, allowance = null }) => {
  const navigate = useNavigate();
  // Only show when explicitly open and when credits are low or exhausted
  if (!isOpen) return null;
  if (credits !== null) {
    const fullBalance = Number.isFinite(Number(allowance)) && Number(allowance) > 0
      ? Number(allowance)
      : FREE_TRIAL_CREDITS;
    if (credits >= fullBalance) return null; // hide when user has a full balance
  }
  const message = credits === 0
    ? `You've used all your evaluation credits. Subscribe to keep practicing: Weekly ${WEEKLY.label} (${WEEKLY.credits} exams) or Monthly ${MONTHLY.label} (${MONTHLY.credits} exams).`
    : `Only ${credits} evaluation credit${credits === 1 ? '' : 's'} remaining. Subscribe to Monthly Mastery for ${MONTHLY.credits} exams/month.`;

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
          navigate('/pricing?plan=monthly');
        }}
        className="bg-[#2C3E50] text-white w-full sm:w-auto px-5 h-[34px] rounded-[10px] text-[12px] font-semibold hover:bg-[#1D2939] transition-all flex items-center justify-center whitespace-nowrap shrink-0"
      >
        Upgrade
      </button>
    </div>
  );
};
