import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { useAuth } from '../context/AuthContext';
import { getRememberedEmail, setPostAuthRedirect } from '../utils/authStorage';

const LoginPage1 = () => {
  const { login, signInWithGoogle, rememberMePreference, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(rememberMePreference ?? true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = location.state?.from;
  const from = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ''}`
    : '/dashboard';
  const fromState = fromLocation?.state;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true, state: fromState });
    }
  }, [isAuthenticated, isLoading, navigate, from, fromState]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      if (from && from !== '/dashboard') setPostAuthRedirect(from);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password, rememberMe });
      navigate(from, { replace: true, state: fromState });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout noBox>
      <div className="animate-fadeIn">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1f36', margin: '0 0 12px 0', letterSpacing: '-0.02em', fontFamily: "'Nunito', sans-serif" }}>
            Welcome Back!
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280', margin: 0, fontWeight: 400 }}>
            Log in to access your account and manage everything in one place.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Google first */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="btn-google"
          style={{
            width: '100%',
            height: '52px',
            backgroundColor: 'white',
            border: '1.5px solid #E5E7EB',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 600,
            color: '#374151',
            transition: 'all 0.2s ease',
            opacity: isGoogleLoading ? 0.7 : 1,
            marginBottom: '8px',
          }}
        >
          {Icons.google}
          {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 24px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          <span style={{ margin: '0 16px', fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Email</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = COLORS.blue}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = COLORS.blue}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, opacity: 0.6 }}
              >
                {showPassword ? Icons.eye : Icons.eyeOff}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <label
              htmlFor="remember-me"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#1a1f36',
                fontWeight: 600,
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: rememberMe ? `2px solid ${COLORS.blue}` : '2px solid #9CA3AF',
                  background: rememberMe ? COLORS.blue : '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: rememberMe ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
                }}
                aria-hidden
              >
                {rememberMe && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 6.2L4.8 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  margin: 0,
                }}
              />
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
              ...(email && password && !isSubmitting ? formStyles.button.active : formStyles.button.disabled),
              height: '52px',
              fontSize: '15px',
              transition: 'all 0.3s ease',
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : (email && password ? 'pointer' : 'not-allowed'),
            }}
            disabled={!email || !password || isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Signup Link */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '15px' }}>
            <span style={{ color: '#4B5563', fontWeight: 400 }}>Don't have an account? </span>
            <Link
              to="/signup"
              state={fromLocation ? { from: fromLocation } : undefined}
              style={{ color: COLORS.blue, fontWeight: 600, textDecoration: 'none' }}
            >
              Start your free trial
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default LoginPage1;
