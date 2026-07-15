import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { useAuth } from '../context/AuthContext';
import { useGrade } from '../context/GradeContext';
import { setPostAuthRedirect } from '../utils/authStorage';
import { resolvePostAuthNavigation, fromLocationToPath } from '../utils/postAuthResume';
import { trackFunnelEvent } from '../utils/funnelEvents';

const SignupPage5 = () => {
  const { register, signInWithGoogle, isAuthenticated, isLoading, user } = useAuth();
  const {
    essayData,
    pendingSubmit,
    pendingUploadGrade,
    submissionId,
  } = useGrade();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = location.state?.from;
  const searchIntent = new URLSearchParams(location.search).get('intent');
  const isFreeReportIntent =
    !!fromLocation
    || searchIntent === 'upload'
    || searchIntent === 'mock'
    || pendingSubmit
    || pendingUploadGrade
    || !!essayData?.essayContent;

  const fromPath = fromLocationToPath(fromLocation);

  useEffect(() => {
    trackFunnelEvent('auth_gate_view', isFreeReportIntent ? 'signup_intent' : 'signup');
  }, [isFreeReportIntent]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const dest = resolvePostAuthNavigation({
        user,
        fromLocation,
        essayContent: essayData?.essayContent,
        pendingSubmit,
        pendingUploadGrade,
        submissionId,
      });
      navigate(dest.pathname, { replace: true, state: dest.state });
    }
  }, [isAuthenticated, isLoading, user, navigate, fromLocation, essayData, pendingSubmit, pendingUploadGrade, submissionId]);

  const resumeAfterAuth = (authedUser) => {
    trackFunnelEvent('signup_complete', isFreeReportIntent ? 'intent' : 'cold');
    const dest = resolvePostAuthNavigation({
      user: authedUser,
      fromLocation,
      essayContent: essayData?.essayContent,
      pendingSubmit,
      pendingUploadGrade,
      submissionId,
    });
    navigate(dest.pathname, { replace: true, state: dest.state });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const dest = resolvePostAuthNavigation({
        user: { credits_remaining: 1 },
        fromLocation,
        essayContent: essayData?.essayContent,
        pendingSubmit,
        pendingUploadGrade,
        submissionId,
      });
      setPostAuthRedirect(dest.pathname);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isFormValid = isFreeReportIntent
    ? formData.email.length > 0 && formData.password.length > 0
    : Object.values(formData).every((val) => val.length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (!isFreeReportIntent && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const u = await register({
        first_name: isFreeReportIntent ? '' : formData.firstName,
        last_name: isFreeReportIntent ? '' : formData.lastName,
        full_name: isFreeReportIntent
          ? 'User'
          : `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
      });
      resumeAfterAuth(u);
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      if (msg.toLowerCase().includes('already exists') || err.status === 409) {
        setError('An account with this email already exists.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout noBox>
      <div className="animate-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1f36', margin: '0 0 12px 0', letterSpacing: '-0.02em', fontFamily: "'Nunito', sans-serif" }}>
            {isFreeReportIntent ? 'Create account to unlock your free report' : 'Create Your Account'}
          </h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.5', fontWeight: 400 }}>
            {isFreeReportIntent
              ? 'No card required. Continue with Google or email.'
              : 'Join us and start your journey in just a few clicks.'}
          </p>
        </div>

        {/* Google first for free-report intent */}
        {isFreeReportIntent && (
          <>
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
                transition: 'all 0.2s',
                opacity: isGoogleLoading ? 0.7 : 1,
                marginBottom: '20px',
              }}
            >
              {Icons.google}
              {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 24px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
              <span style={{ margin: '0 16px', fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>or continue with email</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
              {error}
              {error.toLowerCase().includes('already exists') && (
                <div style={{ marginTop: '8px' }}>
                  <Link
                    to="/login"
                    state={fromLocation ? { from: fromLocation } : undefined}
                    style={{ color: COLORS.blue, fontWeight: 700, textDecoration: 'none' }}
                  >
                    Log in instead →
                  </Link>
                </div>
              )}
            </div>
          )}

          {!isFreeReportIntent && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={formStyles.label}>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Enter First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  style={{ ...formStyles.input, border: '1.5px solid #E5E7EB' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={formStyles.label}>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Enter Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  style={{ ...formStyles.input, border: '1.5px solid #E5E7EB' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter Email"
              value={formData.email}
              onChange={handleChange}
              style={{ ...formStyles.input, border: '1.5px solid #E5E7EB' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>{isFreeReportIntent ? 'Password' : 'Create Password'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB' }}
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

          {!isFreeReportIntent && (
            <div style={{ marginBottom: '20px' }}>
              <label style={formStyles.label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{ ...formStyles.input, border: '1.5px solid #E5E7EB' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, opacity: 0.6 }}
                >
                  {showConfirmPassword ? Icons.eye : Icons.eyeOff}
                </button>
              </div>
            </div>
          )}

          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
            By clicking sign up, you agree to our{' '}
            <Link to="/terms" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
            {' and '}
            <Link to="/privacy" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy.</Link>
          </div>

          <button
            type="submit"
            style={{
              ...(isFormValid && !isSubmitting ? formStyles.button.active : formStyles.button.disabled),
              height: '52px',
              fontSize: '15px',
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : (isFormValid ? 'pointer' : 'not-allowed'),
            }}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : (isFreeReportIntent ? 'Create account & continue' : 'Register')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '15px' }}>
            <span style={{ color: '#4B5563', fontWeight: 400 }}>Already have an account? </span>
            <Link
              to="/login"
              state={fromLocation ? { from: fromLocation } : undefined}
              style={{ color: COLORS.blue, fontWeight: 600, textDecoration: 'none' }}
            >
              Login
            </Link>
          </div>

          {!isFreeReportIntent && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                <span style={{ margin: '0 16px', fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
              </div>
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
                  transition: 'all 0.2s',
                  opacity: isGoogleLoading ? 0.7 : 1,
                }}
              >
                {Icons.google}
                {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>
            </>
          )}
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignupPage5;
