const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/discounts/validate ────────────────────────────────────────────
// User-facing: validate a discount code before checkout (does NOT consume it)
router.post('/validate', authenticateToken, async (req, res) => {
  const { code } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Discount code is required.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error || !data) {
      return res.status(404).json({ valid: false, error: 'Invalid discount code.' });
    }

    if (!data.is_active) {
      return res.status(400).json({ valid: false, error: 'This discount code is no longer active.' });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(400).json({ valid: false, error: 'This discount code has expired.' });
    }

    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      return res.status(400).json({ valid: false, error: 'This discount code has reached its usage limit.' });
    }

    return res.json({
      valid: true,
      code: data.code,
      description: data.description,
      discount_type: data.discount_type,    // 'percentage' | 'fixed'
      discount_value: parseFloat(data.discount_value),
      expires_at: data.expires_at,
      uses_remaining: data.max_uses !== null ? data.max_uses - data.uses_count : null,
    });
  } catch (err) {
    console.error('[discounts/validate]', err.message);
    return res.status(500).json({ error: 'Failed to validate discount code.' });
  }
});

// ─── POST /api/discounts/apply ────────────────────────────────────────────────
// Called after successful payment to record discount code usage
router.post('/apply', authenticateToken, async (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: 'code is required.' });

  try {
    // Re-validate before applying
    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .select('id, uses_count, max_uses, is_active, expires_at')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error || !data || !data.is_active) {
      return res.status(400).json({ error: 'Invalid or inactive discount code.' });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Discount code has expired.' });
    }

    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      return res.status(400).json({ error: 'Discount code usage limit reached.' });
    }

    // Atomically increment uses_count
    const { error: updateError } = await supabaseAdmin
      .from('discount_codes')
      .update({ uses_count: data.uses_count + 1 })
      .eq('id', data.id)
      .eq('uses_count', data.uses_count); // Optimistic lock

    if (updateError) throw updateError;

    return res.json({ message: 'Discount applied successfully.' });
  } catch (err) {
    console.error('[discounts/apply]', err.message);
    return res.status(500).json({ error: 'Failed to apply discount code.' });
  }
});

module.exports = router;
