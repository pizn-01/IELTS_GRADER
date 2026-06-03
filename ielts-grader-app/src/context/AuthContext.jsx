import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Hydrate the user state from a Supabase session.
   * Merges auth user with the `profiles` table row.
   */
  const hydrateUser = async (supabaseUser) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch {
      // Fallback: at minimum use the auth user data
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || 'User',
        target_band: 7.0,
        credits_remaining: 4,
        profile_image_url: null,
      });
    }
  };

  // On mount: restore session from local storage (Supabase handles this automatically)
  // and listen for auth state changes (login, logout, token refresh, OAuth redirect)
  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateUser(session?.user ?? null).finally(() => setIsLoading(false));
    });

    // Listen for ongoing auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Login with email + password.
   * Throws on failure so the calling component can display the error.
   */
  const login = async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw new Error(error.message);
    await hydrateUser(data.user);
    return user;
  };

  /**
   * Google OAuth — initiates redirect flow.
   * Supabase will redirect back to /dashboard after success.
   */
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw new Error(error.message);
  };

  /**
   * Register a new user with email + password.
   * Supabase sends a verification email automatically.
   */
  const register = async (profile) => {
    const { data, error } = await supabase.auth.signUp({
      email: profile.email,
      password: profile.password,
      options: {
        data: {
          full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          target_band: 7.0,
        },
      },
    });
    if (error) throw new Error(error.message);
    // User needs to verify email — session may be null until confirmed
    if (data.user) await hydrateUser(data.user);
    return data.user;
  };

  /**
   * Logout — clears local session and resets state.
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /**
   * Update local user state immediately (e.g. after profile settings save).
   * Does NOT call the backend — call api.updateProfile() separately.
   */
  const updateUser = (updates) => {
    setUser(prev => (prev ? { ...prev, ...updates } : prev));
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
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
