import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { api } from '../services/api';

const ForgotPasswordPage7 = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError('');
    try {
      await api.forgotPassword({ email });
      navigate('/check-email');
    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout noBox>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
          Forgot Password
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto', maxWidth: '460px', lineHeight: 1.7 }}>
          Please enter the email associated with your account. We'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: '28px' }}>
          <label style={formStyles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={formStyles.input}
          />
        </div>

        <button
          type="submit"
          style={email && !isSubmitting ? formStyles.button.active : formStyles.button.disabled}
          disabled={!email || isSubmitting}
          className="btn-primary-active"
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '15px' }}>
          <span style={{ color: '#374151', fontWeight: 500 }}>Back to </span>
          <Link to="/login" style={{ color: COLORS.blue, fontWeight: 600, textDecoration: 'none' }}>
            Log In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage7;
