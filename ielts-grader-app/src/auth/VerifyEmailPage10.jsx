import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles } from "./Common.jsx";
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { clearVerificationEmailSent } from '../utils/authStorage';

const VerifyEmailPage10 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser, isAuthenticated } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const email = user?.email || location.state?.email || '';
  const fromPayment = Boolean(location.state?.fromPayment);

  const handleResend = async () => {
    if (!email) {
      setError('Could not determine your email address. Please go back and sign up again.');
      return;
    }
    setResending(true);
    setError('');
    try {
      await api.resendVerification(email);
      setResent(true);
    } catch (err) {
      setError(err.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleContinue = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const fresh = await api.getMe();
      updateUser(fresh);
      if (fresh.email_verified) {
        clearVerificationEmailSent();
        navigate('/dashboard', { replace: true });
      } else {
        setError('Email not verified yet. Click the link in your inbox, then try again.');
      }
    } catch (err) {
      setError(err.message || 'Could not refresh your account status.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout noBox>
      <div style={{ textAlign: 'center', padding: '40px 0 10px' }}>
        <div style={{ width: '72px', height: '72px', backgroundColor: '#33AAFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
          {Icons.envelope}
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Verify Your Email
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto 12px', maxWidth: '420px', lineHeight: 1.7 }}>
          We&apos;ve sent a verification link to{email ? <> <strong style={{ color: '#1a1f36' }}>{email}</strong></> : ' your email'}.
          {fromPayment
            ? ' Confirm it so we can reach you about billing and account recovery.'
            : ' Click the link to continue using IELTS Grader.'}
        </p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 auto 32px', maxWidth: '380px', lineHeight: 1.6 }}>
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </p>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '14px', color: '#DC2626', maxWidth: '380px', margin: '0 auto 16px' }}>
            {error}
          </div>
        )}

        {resent ? (
          <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '10px', padding: '10px 16px', marginBottom: '20px', fontSize: '14px', color: '#15803D', maxWidth: '380px', margin: '0 auto 20px' }}>
            Verification email resent! Please check your inbox.
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            style={{ ...formStyles.button.active, marginBottom: '12px' }}
            className="btn-primary-active"
          >
            {resending ? 'Sending…' : 'Resend Verification Email'}
          </button>
        )}

        <button
          onClick={handleContinue}
          disabled={checking}
          style={{
            ...formStyles.button.active,
            marginTop: '8px',
            background: '#fff',
            color: '#1a1f36',
            border: '1.5px solid #E5E7EB',
          }}
        >
          {checking
            ? 'Checking…'
            : isAuthenticated
              ? "I've verified. Continue"
              : 'Sign In'}
        </button>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage10;
