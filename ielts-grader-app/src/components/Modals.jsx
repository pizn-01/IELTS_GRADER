import React from 'react';
import { Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

export const NotificationBanner = ({ isOpen, onClose, credits = null }) => {
  const navigate = useNavigate();
  // Only show when explicitly open and when credits are low or exhausted
  if (!isOpen) return null;
  if (credits !== null && credits > 2) return null; // hide when user has enough credits

  const message = credits === 0
    ? "You've used all your evaluation credits. Subscribe to keep practicing — Weekly $9.99 (20 exams) or Monthly $24.99 (100 exams)."
    : `Only ${credits} evaluation credit${credits === 1 ? '' : 's'} remaining. Subscribe to Monthly Mastery for 100 exams/month.`;

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
        onClick={() => navigate('/upgrade')}
        className="bg-[#2C3E50] text-white w-full sm:w-auto px-5 h-[34px] rounded-[10px] text-[12px] font-semibold hover:bg-[#1D2939] transition-all flex items-center justify-center whitespace-nowrap shrink-0"
      >
        Upgrade
      </button>
    </div>
  );
};
