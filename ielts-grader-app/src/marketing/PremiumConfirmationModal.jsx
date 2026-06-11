import React from 'react';
import { X, Sparkles } from 'lucide-react';

const PremiumConfirmationModal = ({ isOpen, onClose, onConfirm, price, planName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
      {/* Backdrop: neutral dark, subtle blur — background cards remain readable */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white w-full max-w-[560px] rounded-[20px] px-10 py-10 relative z-10 shadow-xl">

        {/* Close button — flush to corner, no background ring */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          <X className="w-[22px] h-[22px]" strokeWidth={2} />
        </button>

        <div className="flex flex-col items-center text-center">

          {/* Icon */}
          <div className="w-[68px] h-[68px] bg-[#3B82F6] rounded-full flex items-center justify-center mb-6 shadow-[0_8px_24px_rgba(59,130,246,0.3)]">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-[22px] font-bold text-[#1a1f36] mb-3 tracking-tight">
            Ready to go premium?
          </h2>

          {/* Description */}
          <p className="text-[14px] text-[#6B7280] leading-[1.7] mb-8 max-w-[340px]">
            You're about to subscribe to the{' '}
            <span className="font-bold text-[#1a1f36]">{planName}</span>{' '}
            plan at{' '}
            <span className="font-bold text-[#1a1f36]">${price}</span>.{' '}
            You can cancel anytime.
          </p>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full h-[52px] bg-[#1a1f36] text-white rounded-[10px] font-semibold text-[15px] hover:bg-[#2a2f46] transition-all active:scale-[0.98]"
            >
              Confirm and Subscribe
            </button>

            <button
              onClick={onClose}
              className="w-full h-[52px] bg-white text-[#374151] border border-[#E5E7EB] rounded-[10px] font-semibold text-[14px] hover:bg-[#F9FAFB] transition-all"
            >
              Actually, I just want my free report for now
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PremiumConfirmationModal;
