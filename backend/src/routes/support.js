const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/support ────────────────────────────────────────────────────────
// Submit a support message (Settings → Support tab)
router.post('/', authenticateToken, async (req, res) => {
  const { topic, message, email } = req.body;
  const userId = req.user.userId;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const validTopics = ['General', 'Billing', 'Technical', 'Account', 'Grading', 'Other'];
  const resolvedTopic = validTopics.includes(topic) ? topic : 'Other';

  // Use authenticated user's email if not supplied
  const resolvedEmail = (email || req.user.email || '').trim();

  try {
    const { error } = await supabaseAdmin
      .from('support_messages')
      .insert({
        user_id: userId,
        email: resolvedEmail,
        topic: resolvedTopic,
        message: message.trim(),
        status: 'open',
      });

    if (error) throw error;

    return res.status(201).json({ message: 'Support message submitted. We will get back to you shortly.' });
  } catch (err) {
    console.error('[support/post]', err.message);
    return res.status(500).json({ error: 'Failed to submit support message.' });
  }
});

// ─── GET /api/support ─────────────────────────────────────────────────────────
// Fetch the user's own support message history
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select('id, topic, message, status, created_at, resolved_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[support/get]', error.message);
    return res.status(500).json({ error: 'Failed to fetch support messages.' });
  }

  return res.json({ data: data || [] });
});

module.exports = router;
