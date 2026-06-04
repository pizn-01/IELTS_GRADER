const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const BUCKET = 'avatars';
const SIGNED_URL_EXPIRES_IN = 60; // seconds

// ─── GET /api/storage/avatar-url ─────────────────────────────────────────────
// Returns a pre-signed upload URL + the final public URL.
// Frontend uploads the file directly to Supabase Storage, then saves the
// public URL via PATCH /api/auth/profile.
router.get('/avatar-url', authenticateToken, async (req, res) => {
  const { ext = 'jpg' } = req.query;
  const userId = req.user.userId;

  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowedExts.includes(ext.toLowerCase())) {
    return res.status(400).json({ error: 'Unsupported file type. Use jpg, png, webp, or gif.' });
  }

  // Path: avatars/{userId}/avatar.{ext}  — overwrites previous avatar
  const filePath = `${userId}/avatar.${ext.toLowerCase()}`;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath, { upsert: true });

    if (error) throw error;

    // Public URL for reading after upload
    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return res.json({
      upload_url: data.signedUrl,
      token: data.token,
      path: filePath,
      public_url: publicData.publicUrl,
    });
  } catch (err) {
    console.error('[storage/avatar-url]', err.message);
    return res.status(500).json({ error: 'Failed to generate upload URL.' });
  }
});

module.exports = router;
