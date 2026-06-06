const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Credit pack catalogue — validated server-side, never trust client ──────
const CREDIT_PACKS = {
  'price_1TcqK9FDM9NsOfLRmmYyoSTh': { name: 'Starter Top Up',   credits: 10, amount_cents: 1200 },
  'price_1TcqPbFDM9NsOfLRquDNOJpA': { name: 'Smart Top Up',     credits: 24, amount_cents: 2400 },
  'price_1TcqRfFDM9NsOfLRbZgZMEKc': { name: 'Intensive Top Up', credits: 50, amount_cents: 4400 },
};

// Lazy-init so the server boots even before STRIPE_SECRET_KEY is set
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured.');
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
};

// ─── POST /api/stripe/create-checkout-session ──────────────────────────────
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { price_id } = req.body;
  const userId = req.user.userId;

  const pack = CREDIT_PACKS[price_id];
  if (!pack) return res.status(400).json({ error: 'Invalid price ID.' });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        credits_granted: String(pack.credits),
        pack_name: pack.name,
      },
      success_url: `${process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app'}/settings?tab=Subscription`,
    });

    return res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[stripe/create-checkout-session]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

// ─── POST /api/stripe/webhook ─────────────────────────────────────────────
// Raw body is captured via express.json verify hook in index.js → req.rawBody
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured.');
    return res.status(500).json({ error: 'Webhook not configured.' });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id || session.client_reference_id;
    const creditsGranted = parseInt(session.metadata?.credits_granted || '0');
    const packName = session.metadata?.pack_name || 'Credit Pack';
    const amountCents = session.amount_total || 0;

    if (!userId || !creditsGranted) {
      console.error('[stripe/webhook] Missing user_id or credits_granted in session:', session.id);
      return res.json({ received: true }); // 200 so Stripe stops retrying
    }

    try {
      // Idempotency guard — avoid double-crediting on duplicate webhook delivery
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('stripe_session_id', session.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (existing) {
        console.log('[stripe/webhook] Duplicate event skipped:', session.id);
        return res.json({ received: true });
      }

      // Fetch current balance
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('[stripe/webhook] User not found:', userId);
        return res.json({ received: true });
      }

      const newBalance = profile.credits_remaining + creditsGranted;

      // Update credits + record payment atomically (both must succeed)
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
          .eq('id', userId),
        supabaseAdmin
          .from('payments')
          .upsert({
            user_id: userId,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            amount_cents: amountCents,
            credits_granted: creditsGranted,
            pack_name: packName,
            status: 'completed',
            completed_at: new Date().toISOString(),
          }, { onConflict: 'stripe_session_id' }),
      ]);

      console.log(`[stripe/webhook] +${creditsGranted} credits → user ${userId}. Balance: ${profile.credits_remaining} → ${newBalance}`);
    } catch (err) {
      console.error('[stripe/webhook] Processing failed:', err.message);
      return res.status(500).json({ error: 'Failed to process payment.' });
    }
  }

  return res.json({ received: true });
});

// ─── GET /api/stripe/verify-session/:sessionId ────────────────────────────
// Frontend polls this after Stripe redirect to confirm credits were applied
router.get('/verify-session/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('status, credits_granted, pack_name')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (!payment) return res.json({ status: 'pending' });

    return res.json({
      status: payment.status,
      credits_granted: payment.credits_granted,
      pack_name: payment.pack_name,
    });
  } catch (err) {
    console.error('[stripe/verify-session]', err.message);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;
