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

// ── Subscription plans — allowed for public (unauthenticated) checkout ───────
const SUBSCRIPTION_PLANS = {
  'price_1TcqK9FDM9NsOfLRmmYyoSTh': { name: 'Weekly Sprint',    credits: 10 },
  'price_1TcqPbFDM9NsOfLRquDNOJpA': { name: 'Monthly Mastery',  credits: 24 },
};

// ── Upgrade plans — price IDs loaded from env vars set via fly secrets ────────
// Set: STRIPE_PRICE_WEEKLY_SPRINT and STRIPE_PRICE_MONTHLY_MASTERY
const UPGRADE_PLANS = {
  weekly:  { name: 'Weekly Sprint',   label: '$9.99/week',   get priceId() { return process.env.STRIPE_PRICE_WEEKLY_SPRINT;  } },
  monthly: { name: 'Monthly Mastery', label: '$24.99/month', get priceId() { return process.env.STRIPE_PRICE_MONTHLY_MASTERY; } },
};

// ─── POST /api/stripe/create-public-checkout ──────────────────────────────
// No auth — unauthenticated users go straight to Stripe.
// Webhook will credit the account by matching customer email after payment.
router.post('/create-public-checkout', async (req, res) => {
  const { price_id } = req.body;

  const plan = SUBSCRIPTION_PLANS[price_id];
  if (!plan) return res.status(400).json({ error: 'Invalid plan.' });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      customer_creation: 'always',
      metadata: {
        credits_granted: String(plan.credits),
        pack_name: plan.name,
      },
      success_url: `${process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app'}/selection`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-public-checkout]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

// ─── POST /api/stripe/create-upgrade-checkout ────────────────────────────────
// Authenticated subscription checkout for Weekly Sprint / Monthly Mastery plans
router.post('/create-upgrade-checkout', authenticateToken, async (req, res) => {
  const { plan: planKey } = req.body;
  const userId = req.user.userId;

  const plan = UPGRADE_PLANS[planKey];
  if (!plan) return res.status(400).json({ error: 'Invalid upgrade plan.' });

  const priceId = plan.priceId;
  if (!priceId) {
    console.error(`[stripe/create-upgrade-checkout] Missing env var for plan: ${planKey}`);
    return res.status(500).json({ error: 'Subscription plan not configured. Contact support.' });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { user_id: userId, plan_name: plan.name },
      success_url: `${process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app'}/upgrade`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-upgrade-checkout]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

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

    // Personalized Learning PDF — separate product, no credits
    if (session.metadata?.type === 'learning_material') {
      const userId = session.metadata.user_id || session.client_reference_id;
      const editionNumber = parseInt(session.metadata.edition_number || '0', 10);

      if (!userId || !editionNumber) {
        console.error('[stripe/webhook] learning_material missing user_id or edition_number');
        return res.json({ received: true });
      }

      try {
        const { getGradedSubmissions, getOrCreateEditionRow, editionRange } = require('../services/learningDossier');

        const { data: edition } = await supabaseAdmin
          .from('personalized_learning_editions')
          .select('id, status')
          .eq('user_id', userId)
          .eq('edition_number', editionNumber)
          .maybeSingle();

        if (edition?.status === 'ready') {
          console.log('[stripe/webhook] learning_material already ready:', session.id);
          return res.json({ received: true });
        }

        if (!edition) {
          const submissions = await getGradedSubmissions(userId);
          const { start, end } = editionRange(editionNumber);
          const submissionIds = submissions.slice(start - 1, end).map((s) => s.id);
          await getOrCreateEditionRow(userId, editionNumber, submissionIds);
        }

        await supabaseAdmin
          .from('personalized_learning_editions')
          .update({
            status: 'generating',
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('edition_number', editionNumber);

        const { generateEditionPdf } = require('../services/learningGenerator');
        generateEditionPdf(userId, editionNumber).catch((err) => {
          console.error('[stripe/webhook] learning PDF generation failed:', err.message);
        });

        console.log(`[stripe/webhook] learning_material paid — edition ${editionNumber} for ${userId}`);
      } catch (err) {
        console.error('[stripe/webhook] learning_material processing failed:', err.message);
        return res.status(500).json({ error: 'Failed to process learning payment.' });
      }

      return res.json({ received: true });
    }

    let userId = session.metadata?.user_id || session.client_reference_id;
    const creditsGranted = parseInt(session.metadata?.credits_granted || '0');
    const packName = session.metadata?.pack_name || 'Credit Pack';
    const amountCents = session.amount_total || 0;

    // Public checkout — no user_id in metadata. Look up account by customer email.
    if (!userId) {
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const matched = usersData?.users?.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
          if (matched) userId = matched.id;
        } catch (lookupErr) {
          console.error('[stripe/webhook] Email lookup failed:', lookupErr.message);
        }
      }
    }

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
