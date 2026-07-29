import React from 'react';
import { FileCheck2, X } from 'lucide-react';
import { trackEvent } from '../utils/trackEvent';

/**
 * Post-report nudge to start another exam. Parent must open only after
 * TargetBand / LearningEdition / Upgrade are closed so overlays never stack.
 */
export default function NextExamPopup({
  isOpen,
  onDismiss,
  onTryAnother,
  starting = false,
}) {
  if (!isOpen) return null;

  const goPractice = () => {
    trackEvent('next_exam_cta_clicked', {
      source: 'report_page',
      placement: 'next_exam_popup',
    });
    onTryAnother?.();
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-[20px] shadow-xl border border-gray-100 w-full max-w-[480px] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#1A96F3] shrink-0">
              <FileCheck2 size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#101828]">
                Ready for another exam?
              </h2>
              <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">
                Keep the momentum going — take a timed mock exam or grade another essay
                with the same full tutor report.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            aria-label="Maybe later"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 h-[46px] rounded-[10px] border border-gray-200 text-[14px] font-medium text-[#344054] hover:bg-gray-50"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={goPractice}
            disabled={starting}
            className="flex-1 h-[46px] rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {starting ? 'Checking…' : 'Try another exam'}
          </button>
        </div>
      </div>
    </div>
  );
}
