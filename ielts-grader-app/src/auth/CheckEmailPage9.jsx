import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";

const CheckEmailPage9 = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout noBox>
      <div style={{ textAlign: 'center', padding: '40px 0 10px' }}>
        {/* Icon Container */}
        <div style={{
          width: '72px',
          height: '72px',
          backgroundColor: '#33AAFF',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px auto',
        }}>
          {Icons.envelope}
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
          Reset Your Password
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto 36px auto', maxWidth: '420px', lineHeight: 1.7 }}>
          We've sent a password reset link to your email. Please check your inbox or spam folder to proceed.
        </p>

        <button
          onClick={() => navigate('/reset-password')}
          style={formStyles.button.active}
          className="btn-primary-active"
        >
          Check Email
        </button>
      </div>
    </AuthLayout>
  );
};

export default CheckEmailPage9;
