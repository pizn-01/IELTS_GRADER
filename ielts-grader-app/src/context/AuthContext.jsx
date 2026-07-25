import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { getSignupAttribution } from '../utils/attribution';
import { supabase } from '../lib/supabase';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getRememberMePreference,
  setRememberedEmail,
} from '../utils/authStorage';
import { trackSignUpConversion } from '../utils/googleAds';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if a token exists, silently validate it and hydrate user state
  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await api.getMe();
        setUser(userData);
        setToken(storedToken);
      } catch (err) {
        // Only clear session on auth failures — not on temporary rate limits (429)
        if (err?.status === 401 || err?.status === 403) {
          clearAuthToken();
          setToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  /**
   * Login: call the API, persist the JWT, hydrate user state.
   * credentials.rememberMe controls localStorage vs sessionStorage.
   */
  const login = async (credentials) => {
    const { rememberMe = true, email, ...rest } = credentials || {};
    const { token: t, user: u } = await api.login({ ...rest, email, remember_me: rememberMe });
    setAuthToken(t, !!rememberMe);
    setRememberedEmail(email, !!rememberMe);
    setToken(t);
    setUser(u);
    return u;
  };

  /**
   * Register: call the API, persist the JWT, hydrate user state.
   * New accounts default to remembered sessions.
   */
  const register = async (profile) => {
    const { session_id, attribution } = getSignupAttribution();
    const { token: t, user: u } = await api.register({ ...profile, session_id, attribution });
    setAuthToken(t, true);
    setToken(t);
    setUser(u);
    trackSignUpConversion({ userId: u?.id });
    return u;
  };

  /**
   * Logout: clear persisted token and reset all auth state.
   */
  const logout = () => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  };

  /**
   * updateUser: update local user state (e.g., after profile settings save).
   */
  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  /**
   * signInWithGoogle: initiate Google OAuth via Supabase.
   * The page will redirect — no return value needed.
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  /**
   * setUserFromToken: called by OAuthCallbackPage after exchanging
   * the Supabase token for our backend JWT. OAuth sessions are remembered.
   */
  const setUserFromToken = (token, userData) => {
    setAuthToken(token, true);
    setToken(token);
    setUser(userData);
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    signInWithGoogle,
    setUserFromToken,
    rememberMePreference: getRememberMePreference(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
