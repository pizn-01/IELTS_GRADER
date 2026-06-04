import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { useAuth } from '../context/AuthContext';

const SignupPage5 = () => {
  const { register, signInWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

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
    <AuthLayout>
      <div className="animate-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1f36', marginBottom: '12px', margin: 0, letterSpacing: '-0.02em', fontFamily: "'Nunito', sans-serif" }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.5', fontWeight: 500 }}>
            Register to view your full band score, <br />
            detailed feedback, and improvement plan.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error Banner */}
          {error && (
            <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Names Row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={formStyles.label}>First Name</label>
              <input 
                type="text" 
                name="firstName"
                placeholder="First Name" 
                value={formData.firstName}
                onChange={handleChange}
                style={{...formStyles.input, border: '1.5px solid #E5E7EB'}}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={formStyles.label}>Last Name</label>
              <input 
                type="text" 
                name="lastName"
                placeholder="Last Name" 
                value={formData.lastName}
                onChange={handleChange}
                style={{...formStyles.input, border: '1.5px solid #E5E7EB'}}
              />
            </div>
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Email Address</label>
            <input 
              type="email" 
              name="email"
              placeholder="Enter Email Address" 
              value={formData.email}
              onChange={handleChange}
              style={{...formStyles.input, border: '1.5px solid #E5E7EB'}}
            />
          </div>

          {/* Create Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.label}>Create Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                style={{...formStyles.input, border: '1.5px solid #E5E7EB'}}
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
                  opacity: 0.6
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
                name="confirmPassword"
                placeholder="Re-enter Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{...formStyles.input, border: '1.5px solid #E5E7EB'}}
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
                  padding: 0,
                  opacity: 0.6
                }}
              >
                {showConfirmPassword ? Icons.eye : Icons.eyeOff}
              </button>
            </div>
          </div>

          {/* Terms text */}
          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
            By clicking register, you agree to our{' '}
            <a href="#" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
            {' and '}
            <a href="#" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy.</a>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            style={{
              ...(isFormValid && !isSubmitting ? formStyles.button.active : formStyles.button.disabled),
              height: '54px',
              fontSize: '16px',
              boxShadow: isFormValid ? '0 4px 12px rgba(49, 62, 80, 0.15)' : 'none',
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>

          {/* Login Link */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '15px' }}>
            <span style={{ color: '#4B5563', fontWeight: 500 }}>Already have an account? </span>
            <Link to="/login" style={{ color: COLORS.blue, fontWeight: 700, textDecoration: 'none' }}>
              Login
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
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
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
              cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              color: '#374151',
              transition: 'all 0.2s',
              opacity: isGoogleLoading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!isGoogleLoading) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            {Icons.google}
            {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignupPage5;
