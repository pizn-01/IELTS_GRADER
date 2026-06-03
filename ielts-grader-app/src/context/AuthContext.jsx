import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ielts_token'));
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if a token exists, silently validate it and hydrate user state
  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem('ielts_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch {
        // Token invalid or expired — clear it out
        localStorage.removeItem('ielts_token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  /**
   * Login: call the API, persist the JWT, hydrate user state.
   * Returns the user object on success, throws on failure.
   */
  const login = async (credentials) => {
    const { token: t, user: u } = await api.login(credentials);
    localStorage.setItem('ielts_token', t);
    setToken(t);
    setUser(u);
    return u;
  };

  /**
   * Register: call the API, persist the JWT, hydrate user state.
   * Returns the user object on success, throws on failure.
   */
  const register = async (profile) => {
    const { token: t, user: u } = await api.register(profile);
    localStorage.setItem('ielts_token', t);
    setToken(t);
    setUser(u);
    return u;
  };

  /**
   * Logout: clear persisted token and reset all auth state.
   */
  const logout = () => {
    localStorage.removeItem('ielts_token');
    setToken(null);
    setUser(null);
  };

  /**
   * updateUser: update local user state (e.g., after profile settings save).
   */
  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
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
