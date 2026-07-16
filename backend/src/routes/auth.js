const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabaseAdmin, supabaseAuth } = require('../services/supabase');
const { reconcileUserSubscription } = require('../services/subscriptionSync');
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');
const { saveUserAttribution } = require('../utils/attribution');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function signToken(userId, email, remember = true) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: remember ? '30d' : '1d' });
}

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Resolve an auth user by email. listUsers defaults to 50/page — without
 * pagination, resend/forgot-password silently no-ops for many accounts.
 */
async function findAuthUserByEmail(email) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((u) => String(u.email || '').toLowerCase() === target);
    if (match) return match;
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) return null; // safety cap
  }
}

async function issueVerificationEmail(userId, email, fullName) {
  const newToken = generateToken();
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('profiles').update({
    verification_token: newToken,
    verification_token_expires_at: newExpiry,
  }).eq('id', userId);

  await sendVerificationEmail(email, fullName, newToken, {
    idempotencyKey: `verify/${userId}/${newToken.slice(0, 16)}`,
  });

  return { token: newToken };
}

async function fetchProfile(userId) {
  const [{ data, error }, { count: paymentCount }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select(`
        full_name, target_band, target_band_confirmed, credits_remaining, credits_allowance,
        profile_image_url, is_admin, email_verified,
        subscription_plan, subscription_status, subscription_period_end
      `)
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed'),
  ]);
  if (error) throw new Error(`Profile fetch failed: ${error.message}`);
  const periodEnded = data.subscription_period_end
    && new Date(data.subscription_period_end) <= new Date();
  const isSubscribed = data.subscription_status === 'active' && !periodEnded;
  return {
    ...data,
    credits_remaining: periodEnded ? 0 : data.credits_remaining,
    credits_allowance: periodEnded ? 1 : (data.credits_allowance ?? 1),
    has_paid: isSubscribed || (paymentCount ?? 0) > 0,
    is_subscribed: isSubscribed,
    cancel_at_period_end: false,
  };
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, remember_me: rememberMe = true } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const reconciled = await reconcileUserSubscription(data.user.id);
    const profile = await fetchProfile(data.user.id);
    const token = signToken(data.user.id, data.user.email, rememberMe !== false);

    return res.json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
        credits_remaining: reconciled?.credits_remaining ?? profile.credits_remaining,
        credits_allowance: reconciled?.credits_allowance ?? profile.credits_allowance,
        subscription_plan: reconciled?.subscription_plan ?? profile.subscription_plan,
        subscription_status: reconciled?.subscription_status ?? profile.subscription_status,
        subscription_period_end: reconciled?.subscription_period_end ?? profile.subscription_period_end,
        cancel_at_period_end: reconciled?.cancel_at_period_end ?? false,
        is_subscribed: reconciled
          ? reconciled.subscription_status === 'active'
            && !(reconciled.subscription_period_end && new Date(reconciled.subscription_period_end) <= new Date())
          : profile.is_subscribed,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, full_name, attribution, session_id } = req.body;

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

    // Profile created by DB trigger; poll briefly
    let profile = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise(r => setTimeout(r, 400));
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('full_name, target_band, target_band_confirmed, credits_remaining, profile_image_url, is_admin, email_verified')
        .eq('id', data.user.id)
        .single();
      if (p) { profile = p; break; }
    }

    if (!profile) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('profiles')
        .insert({ id: data.user.id, full_name: name, credits_remaining: 1 })
        .select('full_name, target_band, target_band_confirmed, credits_remaining, profile_image_url, is_admin, email_verified')
        .single();
      if (insErr) console.error('[auth/register] Profile fallback insert error:', insErr.message);
      profile = inserted || { full_name: name, target_band: 7.5, target_band_confirmed: false, credits_remaining: 1, profile_image_url: null, email_verified: false };
    }

    // Enforce 1 free trial credit, set email_verified = false, generate verification token.
    // Verification email is deferred until after the first free evaluation.
    const verificationToken = generateToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    await supabaseAdmin.from('profiles').update({
      credits_remaining: 1,
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires_at: verificationExpiry,
    }).eq('id', data.user.id);

    profile = { ...profile, credits_remaining: 1, email_verified: false };

    await saveUserAttribution(supabaseAdmin, data.user.id, { attribution, session_id, req }).catch(err =>
      console.error('[auth/register] Attribution save failed:', err.message)
    );

    // Send verification email during signup. Await so failures are logged; do not
    // fail registration if Resend is temporarily unavailable (user can resend).
    try {
      await sendVerificationEmail(email, name, verificationToken, {
        idempotencyKey: `verify/${data.user.id}/${verificationToken.slice(0, 16)}`,
      });
    } catch (err) {
      console.error('[auth/register] Verification email failed:', err.message);
    }

    const token = signToken(data.user.id, data.user.email);
    const fullProfile = await fetchProfile(data.user.id).catch(() => profile);

    return res.status(201).json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...fullProfile,
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
    const reconciled = await reconcileUserSubscription(req.user.userId);
    const profile = await fetchProfile(req.user.userId);
    return res.json({
      id: req.user.userId,
      email: req.user.email,
      ...profile,
      credits_remaining: reconciled?.credits_remaining ?? profile.credits_remaining,
      credits_allowance: reconciled?.credits_allowance ?? profile.credits_allowance,
      subscription_plan: reconciled?.subscription_plan ?? profile.subscription_plan,
      subscription_status: reconciled?.subscription_status ?? profile.subscription_status,
      is_subscribed: reconciled
        ? reconciled.subscription_status === 'active'
          && !(reconciled.subscription_period_end && new Date(reconciled.subscription_period_end) <= new Date())
        : profile.is_subscribed,
      cancel_at_period_end: reconciled?.cancel_at_period_end ?? false,
    });
  } catch (err) {
    console.error('[auth/me]', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── GET /api/auth/verify-email ───────────────────────────────────────────────
// Called when user clicks the link in the verification email
// ?token=<hex-token>
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email_verified, verification_token_expires_at')
      .eq('verification_token', token)
      .single();

    if (error || !profile) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    if (profile.email_verified) {
      return res.json({ message: 'Email already verified.' });
    }

    if (new Date(profile.verification_token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        email_verified: true,
        // Keep verification_token so duplicate clicks / React remounts stay idempotent
        verification_token_expires_at: null,
      })
      .eq('id', profile.id);

    return res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('[auth/verify-email]', err.message);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ─── POST /api/auth/send-verification ─────────────────────────────────────────
// Authenticated: generate/refresh token and send verification email (used after
// first free evaluation). Always safe to call; no-ops if already verified.
router.post('/send-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const email = req.user.email;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email_verified')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    if (profile.email_verified) {
      return res.json({ message: 'Email already verified.', already_verified: true });
    }

    await issueVerificationEmail(userId, email, profile.full_name);
    return res.json({ message: 'Verification email sent.', sent: true });
  } catch (err) {
    console.error('[auth/send-verification]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to send verification email.' });
  }
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Always return success to prevent email enumeration — but still await the send
  // so failures are logged and retries can succeed on the next click.
  try {
    const authUser = await findAuthUserByEmail(email);

    if (authUser) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email_verified')
        .eq('id', authUser.id)
        .single();

      if (profile && !profile.email_verified) {
        await issueVerificationEmail(profile.id, email, profile.full_name);
      }
    }
  } catch (err) {
    console.error('[auth/resend-verification]', err.message);
  }

  return res.json({ message: 'If an account exists, a new verification email has been sent.' });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Always return success to prevent email enumeration
  try {
    const authUser = await findAuthUserByEmail(email);

    if (authUser) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        const resetToken = generateToken();
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

        await supabaseAdmin.from('profiles').update({
          reset_token: resetToken,
          reset_token_expires_at: resetExpiry,
        }).eq('id', profile.id);

        await sendPasswordResetEmail(email, profile.full_name, resetToken, {
          idempotencyKey: `reset/${profile.id}/${resetToken.slice(0, 16)}`,
        });
      }
    }
  } catch (err) {
    console.error('[auth/forgot-password]', err.message);
  }

  return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Accepts our own token from the reset email link
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, reset_token_expires_at')
      .eq('reset_token', token)
      .single();

    if (error || !profile) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    if (new Date(profile.reset_token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // Clear reset token
    await supabaseAdmin.from('profiles').update({
      reset_token: null,
      reset_token_expires_at: null,
    }).eq('id', profile.id);

    return res.json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error('[auth/reset-password]', err.message);
    return res.status(500).json({ error: 'Password reset failed. The link may have expired.' });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
router.patch('/profile', authenticateToken, async (req, res) => {
  const { full_name, target_band, target_band_confirmed, profile_image_url } = req.body;
  const userId = req.user.userId;

  const updates = {};
  if (full_name !== undefined)         updates.full_name = String(full_name).trim();
  if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url;
  if (target_band !== undefined) {
    const band = parseFloat(target_band);
    if (isNaN(band) || band < 1 || band > 9) {
      return res.status(400).json({ error: 'target_band must be between 1.0 and 9.0.' });
    }
    updates.target_band = Math.round(band * 2) / 2;
    updates.target_band_confirmed = true;
  }
  if (target_band_confirmed !== undefined && target_band === undefined) {
    updates.target_band_confirmed = Boolean(target_band_confirmed);
  }
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('full_name, target_band, target_band_confirmed, credits_remaining, profile_image_url, is_admin, email_verified')
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
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword,
    });

    if (signInError) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

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
router.post('/google', async (req, res) => {
  const { access_token, attribution, session_id } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'access_token is required.' });
  }

  try {
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(access_token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired Google token.' });
    }

    let profile = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('full_name, target_band, target_band_confirmed, credits_remaining, profile_image_url, is_admin, email_verified')
        .eq('id', user.id)
        .single();
      if (p) { profile = p; break; }
      await new Promise(r => setTimeout(r, 400));
    }

    if (!profile) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '';
      const avatarUrl = user.user_metadata?.avatar_url || null;

      const { data: inserted } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          profile_image_url: avatarUrl,
          credits_remaining: 1,
          email_verified: true,  // Google accounts are already verified
        })
        .select('full_name, target_band, target_band_confirmed, credits_remaining, profile_image_url, is_admin, email_verified')
        .single();

      profile = inserted || {
        full_name: fullName,
        target_band: 7.5,
        target_band_confirmed: false,
        credits_remaining: 1,
        profile_image_url: avatarUrl,
        email_verified: true,
      };
    }

    const userCreatedAt = new Date(user.created_at || 0).getTime();
    const isNewUser = Date.now() - userCreatedAt < 60000;

    if (isNewUser) {
      // Only force free-trial credit when the profile was just created (insert path).
      // Do not reset credits on every Google login within the 60s window.
      if (!profile.credits_remaining || profile.credits_remaining < 1) {
        await supabaseAdmin.from('profiles').update({
          credits_remaining: 1,
          credits_allowance: 1,
          email_verified: true,
        }).eq('id', user.id);
        profile = { ...profile, credits_remaining: 1, credits_allowance: 1, email_verified: true };
      } else {
        await supabaseAdmin.from('profiles').update({ email_verified: true }).eq('id', user.id);
        profile = { ...profile, email_verified: true };
      }

      await saveUserAttribution(supabaseAdmin, user.id, { attribution, session_id, req }).catch(err =>
        console.error('[auth/google] Attribution save failed:', err.message)
      );
    } else if (!profile.email_verified) {
      // Existing Google user — mark verified (Google guarantees it)
      await supabaseAdmin.from('profiles').update({ email_verified: true }).eq('id', user.id);
      profile = { ...profile, email_verified: true };
    }

    const reconciled = await reconcileUserSubscription(user.id).catch(() => null);
    const fullProfile = await fetchProfile(user.id).catch(() => profile);
    const token = signToken(user.id, user.email);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        ...fullProfile,
        credits_remaining: reconciled?.credits_remaining ?? fullProfile.credits_remaining,
        credits_allowance: reconciled?.credits_allowance ?? fullProfile.credits_allowance,
        subscription_plan: reconciled?.subscription_plan ?? fullProfile.subscription_plan,
        subscription_status: reconciled?.subscription_status ?? fullProfile.subscription_status,
        subscription_period_end: reconciled?.subscription_period_end ?? fullProfile.subscription_period_end,
        cancel_at_period_end: reconciled?.cancel_at_period_end ?? false,
        is_subscribed: reconciled
          ? reconciled.subscription_status === 'active'
            && !(reconciled.subscription_period_end && new Date(reconciled.subscription_period_end) <= new Date())
          : fullProfile.is_subscribed,
      },
    });
  } catch (err) {
    console.error('[auth/google]', err.message);
    return res.status(500).json({ error: 'Google authentication failed.' });
  }
});

module.exports = router;
