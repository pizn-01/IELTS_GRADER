import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";

const LoginPage4 = () => {
  const [showPassword, setShowPassword] = useState(true);

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '8px', margin: 0 }}>
          Welcome Back!
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
          Log in to access your account and manage everything in one place.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Email Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Email</label>
          <input
            type="email"
            defaultValue="test@gmail"
            style={formStyles.input}
          />
        </div>

        {/* Password Field - ERROR STATE */}
        <div style={{ marginBottom: '6px' }}>
          <label style={formStyles.label}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              defaultValue="123123"
              style={{
                ...formStyles.input,
                border: '1.5px solid #EF4444',
                boxShadow: '0 0 0 3px rgba(239,68,68,0.1)'
              }}
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
          {/* Error Message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: COLORS.error, marginTop: '6px' }}>
            {Icons.error}
            Incorrect email or password. Please try again.
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#6B7280' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              backgroundColor: COLORS.blue,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Remember me
          </label>
          <a href="#" style={{ fontSize: '14px', fontWeight: 600, color: COLORS.blue, textDecoration: 'none' }}>
            Forgot Password?
          </a>
        </div>

        {/* Sign In Button - ACTIVE */}
        <button
          type="submit"
          className="btn-primary-active"
          style={formStyles.button.active}
        >
          Sign In
        </button>

        {/* Signup Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '15px' }}>
          <span style={{ color: '#374151' }}>Don't have an account? </span>
          <a href="#" style={{ color: COLORS.blue, fontWeight: 500, textDecoration: 'none' }}>
            Sign up for free trial
          </a>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
          <span style={{ margin: '0 12px', fontSize: '13px', color: '#9CA3AF' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
        </div>

        {/* Google Button */}
        <button
          type="button"
          style={{
            width: '100%',
            height: '50px',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 500,
            color: '#374151'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          {Icons.google}
          Continue with Google
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage4;
