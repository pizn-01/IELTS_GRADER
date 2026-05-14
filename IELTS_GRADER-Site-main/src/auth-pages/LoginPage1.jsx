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
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '8px', margin: 0 }}>
          Welcome Back!
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
          Log in to access your account and manage everything in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={formStyles.input}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={formStyles.label}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* Remember Me & Forgot Password */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#6B7280' }}>
            <input type="checkbox" style={{ cursor: 'pointer' }} />
            Remember me
          </label>
          <Link to="/forgot-password" style={{ fontSize: '14px', fontWeight: 600, color: COLORS.blue, textDecoration: 'none' }}>
            Forgot Password?
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          style={(email && password) ? formStyles.button.active : formStyles.button.disabled}
          disabled={!email || !password}
        >
          Sign In
        </button>

        {/* Signup Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '15px' }}>
          <span style={{ color: '#374151' }}>Don't have an account? </span>
          <Link to="/signup" style={{ color: COLORS.blue, fontWeight: 500, textDecoration: 'none' }}>
            Sign up for free trial
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
          onClick={handleSubmit}
          className="btn-google"
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
            color: '#374151',
            transition: 'background-color 0.2s ease'
          }}
        >
          {Icons.google}
          Continue with Google
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage1;
