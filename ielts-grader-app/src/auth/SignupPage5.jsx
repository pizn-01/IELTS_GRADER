import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * /signup redirects into the unified auth page on /login with Sign up selected,
 * preserving post-auth redirect intent (guest grading flow).
 */
const SignupPage5 = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate('/login', {
      replace: true,
      state: {
        ...(location.state || {}),
        authMode: 'signup',
      },
    });
  }, [navigate, location.state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default SignupPage5;
