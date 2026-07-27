import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { trackEvent } from '../utils/trackEvent';

/**
 * Post-report upgrade offer. Parent must open only after TargetBand /
 * LearningEdition are closed so overlays never stack.
 */
export default function ReportUpgradeModal({
  isOpen,
  creditsRemaining = 0,
  onDismiss,
  onPracticeAgain,
}) {
  const navigate = useNavigate();
  const hasCredits = (Number(creditsRemaining) || 0) > 0;

  if (!isOpen) return null;

  const track = () => {
    trackEvent('upgrade_cta_clicked', {
      source: 'report_page',
      placement: 'modal',
      credits_remaining: Number(creditsRemaining) || 0,
    });
  };

  const goUpgrade = () => {
    track();
    onDismiss?.();
    navigate('/upgrade', { state: { from: 'report' } });
  };

  const goPractice = () => {
    onDismiss?.();
    if (onPracticeAgain) {
      onPracticeAgain();
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-[20px] shadow-xl border border-gray-100 w-full max-w-[500px] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#1A96F3] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#101828]">
                Want to improve your IELTS score?
              </h2>
              <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">
                Use this feedback to keep practicing. Get more full evaluations,
                detailed fix cards on every essay, and personalized learning guides.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            aria-label="Keep reading"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          {hasCredits ? (
            <>
              <button
                type="button"
                onClick={goPractice}
                className="flex-1 h-[46px] rounded-[10px] border border-gray-200 text-[14px] font-medium text-[#344054] hover:bg-gray-50"
              >
                Practice another essay
              </button>
              <button
                type="button"
                onClick={goUpgrade}
                className="flex-1 h-[46px] rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939]"
              >
                See plans &amp; continue
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 h-[46px] rounded-[10px] border border-gray-200 text-[14px] font-medium text-[#344054] hover:bg-gray-50"
              >
                Keep reading
              </button>
              <button
                type="button"
                onClick={goUpgrade}
                className="flex-1 h-[46px] rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939]"
              >
                Start your plan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
