import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from "./Common.jsx";
import { useGrade } from '../context/GradeContext';

const SignupPage5 = () => {
  const { setUserStatus } = useGrade();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isFormValid = Object.values(formData).every(val => val.length > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      setUserStatus(prev => ({ 
        ...prev, 
        isLoggedIn: true,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      }));
      navigate('/verify-email');
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1f36', marginBottom: '12px', margin: 0 }}>
          Create Your Account
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>
          Register to view your full band score, <br />
          detailed feedback, and improvement plan.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Names Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={formStyles.label}>First Name</label>
            <input 
              type="text" 
              name="firstName"
              placeholder="Enter First Name" 
              value={formData.firstName}
              onChange={handleChange}
              style={formStyles.input} 
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
              style={formStyles.input} 
            />
          </div>
        </div>

        {/* Email Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Email</label>
          <input 
            type="email" 
            name="email"
            placeholder="Enter Email" 
            value={formData.email}
            onChange={handleChange}
            style={formStyles.input} 
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
              name="confirmPassword"
              placeholder="Re-enter Password"
              value={formData.confirmPassword}
              onChange={handleChange}
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

        {/* Register Button */}
        <button
          type="submit"
          style={isFormValid ? formStyles.button.active : formStyles.button.disabled}
          disabled={!isFormValid}
        >
          Register
        </button>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '15px' }}>
          <span style={{ color: '#374151' }}>Already have an account? </span>
          <Link to="/login" style={{ color: COLORS.blue, fontWeight: 500, textDecoration: 'none' }}>
            Login
          </Link>
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

export default SignupPage5;
