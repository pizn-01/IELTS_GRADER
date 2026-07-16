import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { useAuth } from '../context/AuthContext';
import { setPostAuthRedirect } from '../utils/authStorage';

const SignupPage5 = () => {
  const { register, signInWithGoogle } = useAuth();
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
  const from = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ''}`
    : null;

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      if (from) setPostAuthRedirect(from);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isFormValid = Object.values(formData).every(val => val.length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await register({
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
      });
      navigate('/verify-email');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout noBox>
      <div className="animate-fadeIn">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1f36', margin: '0 0 12px 0', letterSpacing: '-0.02em', fontFamily: "'Nunito', sans-serif" }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.5', fontWeight: 400 }}>
            Join us and start your journey in just a few clicks.
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
          {/* First Name + Last Name */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={formStyles.label}>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="Enter First Name"
                value={formData.firstName}
                onChange={handleChange}
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = COLORS.blue}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = COLORS.blue}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter Email"
              value={formData.email}
              onChange={handleChange}
              style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = COLORS.blue}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {/* Create Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Create Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
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

          {/* Confirm Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Re-enter Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = COLORS.blue}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
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

          {/* Terms */}
          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
            By clicking sign up, you agree to our{' '}
            <a href="#" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
            {' and '}
            <a href="#" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy.</a>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            style={{
              ...(isFormValid && !isSubmitting ? formStyles.button.active : formStyles.button.disabled),
              height: '52px',
              fontSize: '15px',
              transition: 'all 0.3s ease',
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : (isFormValid ? 'pointer' : 'not-allowed'),
            }}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>

          {/* Login Link */}
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
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignupPage5;
