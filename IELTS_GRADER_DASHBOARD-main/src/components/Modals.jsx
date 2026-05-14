import React from 'react';
import { Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VerifyEmailModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-8 md:p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white mb-6 md:mb-8 shadow-lg shadow-blue-200">
                <Mail size={32} />
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold mb-4">Verify your email</h2>
              <p className="text-sm md:text-base text-gray-500 mb-8 max-w-sm leading-relaxed">
                Verify your email to continue using our app. We've sent a secure link to <span className="font-semibold text-gray-700">johndoe@gmail.com</span>
              </p>
              
              <div className="text-[13px] md:text-sm">
                <span className="text-gray-400">Didn't receive it? </span>
                <button className="text-blue-600 font-bold hover:underline">Resend email.</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const NotificationBanner = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div 
      style={{ backgroundColor: '#1A96F333' }}
      className="border border-[#3B82F6] rounded-xl px-4 md:px-5 py-3 md:py-0 flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-10 w-full md:h-[60px] gap-4"
    >
      <div className="flex items-start md:items-center gap-3 md:gap-4">
        <div className="w-5 h-5 border-2 border-[#3B82F6] rounded-full flex items-center justify-center text-[#3B82F6] text-[10px] font-black shrink-0 mt-0.5 md:mt-0">
           i
        </div>
        <p className="text-[18px] text-[#101828] font-normal leading-[100%] tracking-[0px]">
          You've used all 5 reports for this week. Upgrade to Monthly Mastery ($19.99) for up to 40 reports.
        </p>
      </div>
      <button className="bg-[#2C3E50] text-white w-full md:w-auto px-8 h-[36px] rounded-lg text-xs font-semibold hover:bg-[#1E293B] transition-all shadow-sm flex items-center justify-center whitespace-nowrap">
        Upgrade
      </button>
    </div>
  );
};
