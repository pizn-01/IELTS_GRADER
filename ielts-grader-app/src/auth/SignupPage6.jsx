import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";

const SignupPage6 = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '8px', margin: 0 }}>
          Create Your Account
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
          Join us and start your journey in just a few clicks.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Names Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={formStyles.label}>First Name</label>
            <input type="text" defaultValue="John" style={formStyles.input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={formStyles.label}>Last Name</label>
            <input type="text" defaultValue="Doe" style={formStyles.input} />
          </div>
        </div>

        {/* Email Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Email</label>
          <input type="email" defaultValue="johndoe@gmail.com" style={formStyles.input} />
        </div>

        {/* Create Password Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Create Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              defaultValue="password123"
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
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              defaultValue="password123"
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

        {/* Terms text */}
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
          By clicking sign up, you agree to our{' '}
          <a href="#" style={{ color: COLORS.blue, textDecoration: 'none' }}>Terms of Service</a>
          {' and '}
          <a href="#" style={{ color: COLORS.blue, textDecoration: 'none' }}>Privacy Policy.</a>
        </div>

        {/* Register Button - ACTIVE */}
        <button
          type="submit"
          className="btn-primary-active"
          style={formStyles.button.active}
        >
          Register
        </button>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '15px' }}>
          <span style={{ color: '#374151' }}>Already have an account? </span>
          <a href="#" style={{ color: COLORS.blue, fontWeight: 500, textDecoration: 'none' }}>
            Login
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

export default SignupPage6;
