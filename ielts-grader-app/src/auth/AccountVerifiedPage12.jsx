import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles } from "./Common.jsx";
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { clearVerificationEmailSent } from '../utils/authStorage';

const AccountVerifiedPage12 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, updateUser } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error' | 'static'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      // No token — this is just the static success page (navigated to without email link)
      setStatus('static');
      return;
    }

    api.verifyEmail(token)
      .then(async () => {
        clearVerificationEmailSent();
        if (isAuthenticated) {
          try {
            const fresh = await api.getMe();
            updateUser(fresh);
          } catch {
            updateUser({ email_verified: true });
          }
        }
        setStatus('success');
      })
      .catch(err => {
        setErrorMsg(err.message || 'Verification failed. The link may have expired.');
        setStatus('error');
      });
  }, [token, isAuthenticated, updateUser]);

  const handleContinue = () => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login');
    }
  };

  if (status === 'verifying') {
    return (
      <AuthLayout noBox>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #2C3E50', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <p style={{ fontSize: '16px', color: '#6B7280' }}>Verifying your email…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthLayout noBox>
        <div style={{ textAlign: 'center', padding: '40px 0 10px' }}>
          <div style={{ width: '72px', height: '72px', backgroundColor: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1f36', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Verification Failed</h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 auto 32px', maxWidth: '380px', lineHeight: 1.7 }}>{errorMsg}</p>
          <button onClick={() => navigate('/verify-email')} style={formStyles.button.active} className="btn-primary-active">
            Resend Verification Email
          </button>
        </div>
      </AuthLayout>
    );
  }

  // 'success' or 'static'
  return (
    <AuthLayout noBox>
      <div style={{ textAlign: 'center', padding: '40px 0 10px' }}>
        <div style={{ width: '72px', height: '72px', backgroundColor: '#33AAFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
          {Icons.check}
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Account Verified!
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto 36px', maxWidth: '420px', lineHeight: 1.7 }}>
          Your email has been verified and your account is now active. You can continue practising.
        </p>
        <button onClick={handleContinue} className="btn-primary-active" style={formStyles.button.active}>
          {isAuthenticated ? 'Continue to Dashboard' : 'Sign In'}
        </button>
      </div>
    </AuthLayout>
  );
};

export default AccountVerifiedPage12;
