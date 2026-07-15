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

const FREE_FUNNEL_SIGNUP_PATHS = new Set(['/analysis-ready']);

/**
 * AdminRoute — wraps admin-only routes. Unauth → /login.
 */
export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
};

/**
 * ProtectedRoute — auth required.
 * Free-funnel destination /analysis-ready → /signup (soft gate).
 * All other protected routes → /login (existing users / session expiry).
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;

  if (!isAuthenticated) {
    const to = FREE_FUNNEL_SIGNUP_PATHS.has(location.pathname) ? '/signup' : '/login';
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  return children;
};
