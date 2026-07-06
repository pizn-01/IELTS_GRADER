import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSignupAttribution } from '../utils/attribution';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setUserFromToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        // Supabase automatically parses the access_token from the URL hash
        // (because detectSessionInUrl: true is set in the supabase client)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          if (!cancelled) setError('Google sign-in failed. Please try again.');
          return;
        }

        // Exchange Supabase token for our custom backend JWT
        const { session_id, attribution } = getSignupAttribution();
        const { token, user } = await api.googleAuth(session.access_token, { session_id, attribution });

        if (cancelled) return;

        // Store JWT and update AuthContext — no page reload needed
        setUserFromToken(token, user);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Authentication failed. Please try again.');
      }
    };

    handleCallback();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <div style={{ width: '56px', height: '56px', background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>✗</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1f36', marginBottom: '12px' }}>Sign-in failed</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px' }}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            style={{ background: '#1a1f36', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #3B82F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '15px', fontWeight: 500 }}>Completing sign-in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OAuthCallbackPage;
