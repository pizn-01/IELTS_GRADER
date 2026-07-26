import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VerifyEmailModal } from '../components/Modals';
import {
  markVerificationEmailSent,
  wasVerificationEmailSent,
} from '../utils/authStorage';

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState('polling'); // 'polling' | 'success' | 'timeout'
  const [packName, setPackName] = useState('');
  const [creditsGranted, setCreditsGranted] = useState(0);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [freshEmail, setFreshEmail] = useState('');
  const redirectTimerRef = useRef(null);

  const goDashboard = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    navigate('/dashboard');
  };

  useEffect(() => {
    if (!sessionId) { navigate('/dashboard'); return; }

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds at 2s intervals
    let cancelled = false;

    const promptVerifyIfNeeded = async (fresh) => {
      if (!fresh || fresh.email_verified) {
        redirectTimerRef.current = setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      setFreshEmail(fresh.email || user?.email || '');
      if (fresh.email && !wasVerificationEmailSent()) {
        try {
          const result = await api.sendVerification();
          if (!result?.already_verified) markVerificationEmailSent();
        } catch {
          try {
            await api.resendVerification(fresh.email);
            markVerificationEmailSent();
          } catch {
            /* modal can resend */
          }
        }
      }
      if (!cancelled) setShowVerifyModal(true);
    };

    const poll = async () => {
      try {
        const result = await api.verifyStripeSession(sessionId);

        if (result.status === 'completed') {
          setPackName(result.pack_name || 'Credit Pack');
          setCreditsGranted(result.credits_granted || 0);
          setStatus('success');

          let fresh = null;
          try {
            fresh = await api.getMe();
            updateUser({
              credits_remaining: fresh.credits_remaining,
              credits_allowance: fresh.credits_allowance,
              subscription_plan: fresh.subscription_plan,
              subscription_status: fresh.subscription_status,
              is_subscribed: fresh.is_subscribed,
              has_paid: fresh.has_paid,
              email_verified: fresh.email_verified,
            });
          } catch {}

          await promptVerifyIfNeeded(fresh);
          return;
        }
      } catch {}

      attempts++;
      if (attempts >= maxAttempts) {
        setStatus('timeout');
        return;
      }

      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-['Inter',_sans-serif]">
      <div className="w-full max-w-[420px] text-center">
        {status === 'polling' && (
          <>
            <Loader className="w-12 h-12 text-[#4FA1FF] animate-spin mx-auto mb-6" />
            <h1 className="text-[24px] font-bold text-[#1a1f36] mb-2">Confirming your payment…</h1>
            <p className="text-[14px] text-[#6B7280]">This only takes a moment. Please don't close this tab.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-[72px] h-[72px] bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-9 h-9 text-[#10B981]" />
            </div>
            <h1 className="text-[28px] font-bold text-[#1a1f36] mb-2">Payment successful!</h1>
            <p className="text-[15px] text-[#4B5563] mb-1">
              <span className="font-bold text-[#1a1f36]">{creditsGranted} credits</span> on <span className="font-semibold">{packName}</span> are now active.
            </p>
            {!showVerifyModal && (
              <p className="text-[13px] text-[#9CA3AF] mt-4">Redirecting you to the dashboard…</p>
            )}
            {showVerifyModal && (
              <button
                type="button"
                onClick={goDashboard}
                className="mt-6 w-full h-[48px] bg-[#1a1f36] text-white rounded-[10px] font-bold text-[14px] hover:bg-[#2a2f46] transition-all"
              >
                Continue to Dashboard
              </button>
            )}
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-[72px] h-[72px] bg-[#FEF9C3] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-9 h-9 text-[#EAB308]" />
            </div>
            <h1 className="text-[24px] font-bold text-[#1a1f36] mb-2">Payment received</h1>
            <p className="text-[14px] text-[#4B5563] mb-6">
              Your payment was processed. Credits may take a moment to appear. Refresh your dashboard if they haven't shown up yet.
            </p>
            <button
              onClick={goDashboard}
              className="w-full h-[48px] bg-[#1a1f36] text-white rounded-[10px] font-bold text-[14px] hover:bg-[#2a2f46] transition-all"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>

      <VerifyEmailModal
        isOpen={showVerifyModal}
        email={freshEmail || user?.email}
        purpose="post_payment"
        onContinueReading={goDashboard}
        onGoVerify={() => navigate('/verify-email', { state: { fromPayment: true } })}
        onResend={async () => {
          const target = freshEmail || user?.email;
          if (!target) return;
          try {
            await api.sendVerification();
          } catch {
            await api.resendVerification(target);
          }
          markVerificationEmailSent();
        }}
      />
    </div>
  );
};

export default CheckoutSuccessPage;
