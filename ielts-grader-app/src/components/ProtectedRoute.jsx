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
 * After all free-trial credits are used, unverified email users must verify
 * before using the rest of the product. Report viewing is exempt.
 */
function needsEmailVerification(user) {
  if (!user || user.email_verified) return false;
  return (Number(user.credits_remaining) || 0) <= 0;
}

/**
 * ProtectedRoute — wraps any route that requires authentication.
 * Shows loader during bootstrap, redirects to /login if unauthenticated,
 * and preserves the intended destination via location state.
 * When allowUnverified is false (default), also gates unverified users
 * who have already used their free-trial credits.
 */
export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
};

export const ProtectedRoute = ({ children, allowUnverified = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowUnverified && needsEmailVerification(user)) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
};
