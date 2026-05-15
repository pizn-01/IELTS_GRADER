import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { api } from '../services/api';

const ResetPasswordPage11 = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || 'mock-token';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await api.resetPassword({ token, newPassword: password });
      navigate('/password-reset-success');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout noBox>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        {/* Icon Container */}
        <div style={{
          width: '72px',
          height: '72px',
          backgroundColor: '#33AAFF',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px auto',
        }}>
          {Icons.lock}
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
          Reset Your Password
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
            {error}
          </div>
        )}
        {/* New Password Field */}
        <div style={{ marginBottom: '24px' }}>
          <label style={formStyles.label}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={formStyles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
            >
              {showPassword ? Icons.eye : Icons.eyeOff}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div style={{ marginBottom: '32px' }}>
          <label style={formStyles.label}>Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Enter Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={formStyles.input}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
            >
              {showConfirmPassword ? Icons.eye : Icons.eyeOff}
            </button>
          </div>
        </div>

        {/* Reset Password Button */}
        <button
          type="submit"
          className="btn-primary-active"
          style={(password && confirmPassword && !isSubmitting) ? formStyles.button.active : formStyles.button.disabled}
          disabled={!password || !confirmPassword || isSubmitting}
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage11;
