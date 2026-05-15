import React from 'react';
import { X, Sparkles } from 'lucide-react';

const PremiumConfirmationModal = ({ isOpen, onClose, onConfirm, price, planName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1a1f36]/60 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="bg-white w-full max-w-[480px] rounded-[24px] p-8 relative z-10 shadow-2xl animate-slideDown">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-[#9CA3AF]" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-[72px] h-[72px] bg-[#3B82F6] rounded-full flex items-center justify-center mb-6 shadow-[0_8px_20px_rgba(59,130,246,0.3)]">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-[24px] font-bold text-[#1a1f36] mb-3">Ready to go premium?</h2>
          
          <p className="text-[15px] text-[#6B7280] leading-relaxed mb-8 max-w-[340px]">
            You're about to subscribe to the <span className="font-bold text-[#1a1f36]">{planName} plan</span> at <span className="font-bold text-[#1a1f36]">${price}</span>. You can cancel anytime.
          </p>

          <div className="w-full space-y-3">
            <button 
              onClick={onConfirm}
              className="w-full h-[54px] bg-[#1a1f36] text-white rounded-[12px] font-bold text-[16px] hover:bg-[#2a2f46] transition-all shadow-lg active:scale-[0.98]"
            >
              Confirm and Subscribe
            </button>
            
            <button 
              onClick={onClose}
              className="w-full h-[54px] bg-white text-[#1a1f36] border border-[#E5E7EB] rounded-[12px] font-bold text-[15px] hover:bg-gray-50 transition-all"
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
