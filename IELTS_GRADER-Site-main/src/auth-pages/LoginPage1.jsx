import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { useGrade } from '../context/GradeContext';

const LoginPage1 = () => {
  const { setUserStatus } = useGrade();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      setUserStatus(prev => ({ ...prev, isLoggedIn: true }));
      navigate('/');
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', marginBottom: '12px', margin: 0, letterSpacing: '-0.02em', fontFamily: "'Nunito', sans-serif" }}>
            Welcome Back!
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280', margin: 0, fontWeight: 500 }}>
            Log in to access your account and manage everything in one place.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={formStyles.label}>Email Address</label>
            <input
              type="email"
              placeholder="Enter Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{...formStyles.input, transition: 'all 0.2s', border: '1.5px solid #E5E7EB'}}
              onFocus={(e) => e.target.style.borderColor = COLORS.blue}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={formStyles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{...formStyles.input, transition: 'all 0.2s', border: '1.5px solid #E5E7EB'}}
                onFocus={(e) => e.target.style.borderColor = COLORS.blue}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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
                  padding: 0,
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
              >
                {showPassword ? Icons.eye : Icons.eyeOff}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#4B5563', fontWeight: 500 }}>
              <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px', borderRadius: '4px' }} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{ fontSize: '14px', fontWeight: 700, color: COLORS.blue, textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            style={{
              ...(email && password ? formStyles.button.active : formStyles.button.disabled),
              height: '54px',
              fontSize: '16px',
              boxShadow: email && password ? '0 4px 12px rgba(49, 62, 80, 0.15)' : 'none',
              transition: 'all 0.3s ease'
            }}
            disabled={!email || !password}
          >
            Sign In
          </button>

          {/* Signup Link */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '15px' }}>
            <span style={{ color: '#4B5563', fontWeight: 500 }}>Don't have an account? </span>
            <Link to="/signup" style={{ color: COLORS.blue, fontWeight: 700, textDecoration: 'none' }}>
              Sign up for free
            </Link>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#F1F5F9' }}></div>
            <span style={{ margin: '0 16px', fontSize: '13px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#F1F5F9' }}></div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="btn-google"
            style={{
              width: '100%',
              height: '54px',
              backgroundColor: 'white',
              border: '1.5px solid #E5E7EB',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              color: '#374151',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            {Icons.google}
            Continue with Google
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default LoginPage1;
