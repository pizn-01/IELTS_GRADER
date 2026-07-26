import React from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../utils/trackEvent';

/**
 * Inline upgrade CTA for the report Overview (after Strengths/Weaknesses).
 */
export default function ReportUpgradeCta({
  creditsRemaining = 0,
  onPracticeAgain,
}) {
  const navigate = useNavigate();
  const hasCredits = (Number(creditsRemaining) || 0) > 0;

  const track = () => {
    trackEvent('upgrade_cta_clicked', {
      source: 'report_page',
      placement: 'after_weaknesses',
      credits_remaining: Number(creditsRemaining) || 0,
    });
  };

  const goUpgrade = () => {
    track();
    navigate('/upgrade', { state: { from: 'report' } });
  };

  const goPractice = () => {
    if (onPracticeAgain) {
      onPracticeAgain();
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="rounded-[16px] border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#FDF2F8] px-5 md:px-8 py-6 md:py-7">
      <h3 className="text-[16px] md:text-[18px] font-bold text-[#101828] mb-1">
        Want to improve your IELTS score?
      </h3>
      <p className="text-[13px] md:text-[14px] text-[#475467] leading-relaxed mb-5 max-w-[640px]">
        Keep practicing with more full evaluations, detailed fix cards on every essay,
        and personalized learning guides based on your performance.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {hasCredits ? (
          <>
            <button
              type="button"
              onClick={goPractice}
              className="h-[44px] px-5 rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939]"
            >
              Practice another essay
            </button>
            <button
              type="button"
              onClick={goUpgrade}
              className="h-[44px] px-5 rounded-[10px] border border-[#2C3E50]/30 text-[14px] font-medium text-[#2C3E50] hover:bg-white/70"
            >
              See plans
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={goUpgrade}
            className="h-[44px] px-5 rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939]"
          >
            Start your plan
          </button>
        )}
      </div>
    </div>
  );
}
