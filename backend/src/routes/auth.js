const express = require('express');
const jwt = require('jsonwebtoken');
const { supabaseAdmin, supabaseAuth } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function signToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

async function fetchProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('full_name, target_band, credits_remaining, profile_image_url')
    .eq('id', userId)
    .single();
  if (error) throw new Error(`Profile fetch failed: ${error.message}`);
  return data;
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const profile = await fetchProfile(data.user.id);
    const token = signToken(data.user.id, data.user.email);

    return res.json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const name = (full_name || `${first_name || ''} ${last_name || ''}`.trim()) || 'User';

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered') || error.status === 422) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      throw error;
    }

    // Profile is created by DB trigger (on_auth_user_created); poll briefly
    let profile = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise(r => setTimeout(r, 400));
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('full_name, target_band, credits_remaining, profile_image_url')
        .eq('id', data.user.id)
        .single();
      if (p) { profile = p; break; }
    }

    // Fallback: insert profile manually if trigger hasn't fired yet
    if (!profile) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('profiles')
        .insert({ id: data.user.id, full_name: name })
        .select('full_name, target_band, credits_remaining, profile_image_url')
        .single();
      if (insErr) console.error('[auth/register] Profile fallback insert error:', insErr.message);
      profile = inserted || { full_name: name, target_band: 7.5, credits_remaining: 5, profile_image_url: null };
    }

    const token = signToken(data.user.id, data.user.email);

    return res.status(201).json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
      },
    });
  } catch (err) {
    console.error('[auth/register]', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const profile = await fetchProfile(req.user.userId);
    return res.json({
      id: req.user.userId,
      email: req.user.email,
      ...profile,
    });
  } catch (err) {
    console.error('[auth/me]', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Always return success to prevent email enumeration
  try {
    await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${FRONTEND_URL}/reset-password`,
    });
  } catch (err) {
    console.error('[auth/forgot-password]', err.message);
  }

  return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Frontend sends { token: token_hash, newPassword }
// token_hash comes from the Supabase reset email URL (?token_hash=...)
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Verify the recovery OTP from the email link
    const { data, error: verifyError } = await supabaseAuth.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError || !data.user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    return res.json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error('[auth/reset-password]', err.message);
    return res.status(500).json({ error: 'Password reset failed. The link may have expired.' });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
// Update full_name, target_band, and/or profile_image_url
router.patch('/profile', authenticateToken, async (req, res) => {
  const { full_name, target_band, profile_image_url } = req.body;
  const userId = req.user.userId;

  const updates = {};
  if (full_name !== undefined)         updates.full_name = String(full_name).trim();
  if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url;
  if (target_band !== undefined) {
    const band = parseFloat(target_band);
    if (isNaN(band) || band < 1 || band > 9) {
      return res.status(400).json({ error: 'target_band must be between 1.0 and 9.0.' });
    }
    updates.target_band = Math.round(band * 2) / 2; // clamp to 0.5 increments
  }
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length === 1) { // only updated_at
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('full_name, target_band, credits_remaining, profile_image_url')
      .single();

    if (error) throw error;

    return res.json({
      id: userId,
      email: req.user.email,
      ...data,
    });
  } catch (err) {
    console.error('[auth/profile]', err.message);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Authenticated password change (old password → new password)
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    // Verify current password by attempting sign-in
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });

    if (signInError) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Update to new password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[auth/change-password]', err.message);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────
// Called from the frontend OAuth callback page.
// Accepts a Supabase access_token (from Google OAuth) and returns our JWT.
router.post('/google', async (req, res) => {
  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'access_token is required.' });
  }

  try {
    // Verify the Supabase access token and get the authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(access_token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired Google token.' });
    }

    // Profile is auto-created by DB trigger on first OAuth sign-in; poll briefly
    let profile = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('full_name, target_band, credits_remaining, profile_image_url')
        .eq('id', user.id)
        .single();
      if (p) { profile = p; break; }
      await new Promise(r => setTimeout(r, 400));
    }

    // Fallback: create profile manually if trigger hasn't fired yet
    if (!profile) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '';
      const avatarUrl = user.user_metadata?.avatar_url || null;

      const { data: inserted } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: user.id, full_name: fullName, profile_image_url: avatarUrl })
        .select('full_name, target_band, credits_remaining, profile_image_url')
        .single();

      profile = inserted || {
        full_name: fullName,
        target_band: 7.5,
        credits_remaining: 5,
        profile_image_url: avatarUrl,
      };
    }

    const token = signToken(user.id, user.email);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
    });
  } catch (err) {
    console.error('[auth/google]', err.message);
    return res.status(500).json({ error: 'Google authentication failed.' });
  }
});

module.exports = router;
