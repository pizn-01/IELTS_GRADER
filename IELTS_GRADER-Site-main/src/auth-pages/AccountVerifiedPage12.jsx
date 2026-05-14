import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";

const AccountVerifiedPage12 = () => {
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
          {Icons.check}
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
          Account Verified!
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 auto 36px auto', maxWidth: '420px', lineHeight: 1.7 }}>
          Your email has been verified and your account is now active.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="btn-primary-active"
          style={formStyles.button.active}
        >
          Sign In
        </button>
      </div>
    </AuthLayout>
  );
};

export default AccountVerifiedPage12;
