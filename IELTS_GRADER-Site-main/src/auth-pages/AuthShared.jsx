import React from 'react';

export const COLORS = {
  primary: '#1a1f36',
  secondary: '#374151',
  blue: '#3B82F6',
  grayText: '#6B7280',
  lightGray: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  btnDark: '#2d3a4a',
  btnDarkHover: '#374555',
  btnDisabled: '#F3F4F6'
};

export const Icons = {
  Envelope: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  Checkmark: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  EyeHidden: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  EyeVisible: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Error: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2"/>
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2"/>
    </svg>
  ),
  Google: () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
};

export const formStyles = {
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1a1f36',
    display: 'block',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    height: '48px',
    padding: '12px 16px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '15px',
    color: '#1a1f36',
    backgroundColor: 'white',
    outline: 'none',
    boxSizing: 'border-box'
  },
  inputFocused: {
    border: '1.5px solid #3B82F6',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
  },
  inputError: {
    border: '1.5px solid #EF4444',
    boxShadow: '0 0 0 3px rgba(239,68,68,0.1)'
  },
  fieldSpacing: {
    marginBottom: '20px'
  },
  buttonPrimary: {
    width: '100%',
    height: '50px',
    backgroundColor: '#2d3a4a',
    color: 'white',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
    cursor: 'not-allowed'
  }
};
