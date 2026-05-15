import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Full-page loading spinner shown while the auth bootstrap runs.
 */
const FullPageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
    <div className="w-10 h-10 border-4 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
    <p className="text-sm font-semibold text-gray-400 tracking-wide">
      Verifying session...
    </p>
  </div>
);

/**
 * ProtectedRoute — wraps any route that requires authentication.
 * Shows loader during bootstrap, redirects to /login if unauthenticated,
 * and preserves the intended destination via location state.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
