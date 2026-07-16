import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';

export const VerifyEmailModal = ({
  isOpen,
  email,
  onContinueReading,
  onGoVerify,
  onResend,
}) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!onResend) return;
    setResending(true);
    setError('');
    try {
      await onResend();
      setResent(true);
    } catch (err) {
      setError(err?.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {onContinueReading && (
              <button
                type="button"
                onClick={onContinueReading}
                className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Continue reading report"
              >
                <X size={24} />
              </button>
            )}

            <div className="p-8 md:p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#3B82F6] rounded-full flex items-center justify-center text-white mb-6 md:mb-8 shadow-lg shadow-blue-200">
                <Mail size={32} />
              </div>

              <h2 className="text-xl md:text-2xl font-bold mb-4 text-[#1a1f36]">Verify your email</h2>
              <p className="text-sm md:text-base text-gray-500 mb-6 max-w-sm leading-relaxed">
                Your free evaluation is ready. Verify your email to keep using IELTS Grader.
                {email ? (
                  <>
                    {' '}We&apos;ve sent a secure link to{' '}
                    <span className="font-semibold text-gray-700">{email}</span>.
                  </>
                ) : null}
              </p>

              {error && (
                <p className="text-sm text-red-600 mb-4">{error}</p>
              )}
              {resent && (
                <p className="text-sm text-green-700 mb-4">Verification email resent. Check your inbox (and spam).</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  type="button"
                  onClick={onGoVerify}
                  className="flex-1 h-11 bg-[#1a1f36] text-white rounded-[10px] font-semibold text-sm hover:bg-[#2a2f46] transition-colors"
                >
                  Open verify page
                </button>
                {onContinueReading && (
                  <button
                    type="button"
                    onClick={onContinueReading}
                    className="flex-1 h-11 bg-white border border-[#E5E7EB] text-[#1a1f36] rounded-[10px] font-semibold text-sm hover:bg-[#F9FAFB] transition-colors"
                  >
                    Keep reading report
                  </button>
                )}
              </div>

              <div className="text-[13px] md:text-sm mt-6">
                <span className="text-gray-400">Didn&apos;t receive it? </span>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="text-[#3B82F6] font-bold hover:underline disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend email'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

export const NotificationBanner = ({ isOpen, onClose, credits = null }) => {
  const navigate = useNavigate();
  // Only show when explicitly open and when credits are low or exhausted
  if (!isOpen) return null;
  if (credits !== null && credits > 2) return null; // hide when user has enough credits

  const message = credits === 0
    ? `You've used all your evaluation credits. Subscribe to keep practicing — Weekly ${WEEKLY.label} (${WEEKLY.credits} exams) or Monthly ${MONTHLY.label} (${MONTHLY.credits} exams).`
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
        onClick={() => navigate('/upgrade')}
        className="bg-[#2C3E50] text-white w-full sm:w-auto px-5 h-[34px] rounded-[10px] text-[12px] font-semibold hover:bg-[#1D2939] transition-all flex items-center justify-center whitespace-nowrap shrink-0"
      >
        Upgrade
      </button>
    </div>
  );
};
