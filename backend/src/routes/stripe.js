const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');
const { SUBSCRIPTION_PLANS, getPlanByKey, getPlanKeyFromPriceId } = require('../services/subscriptionPlans');
const {
  findUserIdForSubscription,
  syncSubscriptionRecord,
  grantSubscriptionPeriodCredits,
} = require('../services/subscriptionSync');

const router = express.Router();

// Legacy one-time credit packs — no longer exposed in user-facing UI
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

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app';

async function resolveStripeCustomerId(stripe, userId, email) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const { data: customers } = await stripe.customers.list({ email, limit: 1 });
  if (customers[0]?.id) return customers[0].id;

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });
  return customer.id;
}

// ── Upgrade plans — price IDs from env (STRIPE_PRICE_WEEKLY_SPRINT / MONTHLY_MASTERY)
const UPGRADE_PLANS = {
  weekly:  { ...SUBSCRIPTION_PLANS.weekly,  get priceId() { return process.env.STRIPE_PRICE_WEEKLY_SPRINT;  } },
  monthly: { ...SUBSCRIPTION_PLANS.monthly, get priceId() { return process.env.STRIPE_PRICE_MONTHLY_MASTERY; } },
};

// ─── POST /api/stripe/create-billing-portal-session ─────────────────────────
// Redirects the user to Stripe Customer Portal to manage plan, payment method, invoices.
router.post('/create-billing-portal-session', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;

  if (!email) {
    return res.status(400).json({ error: 'Account email is required to manage billing.' });
  }

  try {
    const stripe = getStripe();
    const customerId = await resolveStripeCustomerId(stripe, userId, email);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONTEND_URL}/subscription`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-billing-portal-session]', err.message);
    return res.status(500).json({ error: 'Failed to open billing portal. Please try again.' });
  }
});

// ─── POST /api/stripe/create-public-checkout ──────────────────────────────
// Deprecated — subscriptions only. Kept for backwards compatibility.
router.post('/create-public-checkout', async (_req, res) => {
  return res.status(410).json({ error: 'One-time checkout is no longer available. Please subscribe at /upgrade.' });
});

// ─── POST /api/stripe/create-upgrade-checkout ────────────────────────────────
// Authenticated subscription checkout for Weekly Sprint / Monthly Mastery plans
router.post('/create-upgrade-checkout', authenticateToken, async (req, res) => {
  const { plan: planKey } = req.body;
  const userId = req.user.userId;
  const email = req.user.email;

  const plan = UPGRADE_PLANS[planKey];
  if (!plan) return res.status(400).json({ error: 'Invalid upgrade plan.' });

  const priceId = plan.priceId;
  if (!priceId) {
    console.error(`[stripe/create-upgrade-checkout] Missing env var for plan: ${planKey}`);
    return res.status(500).json({ error: 'Subscription plan not configured. Contact support.' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Account email is required for subscription checkout.' });
  }

  try {
    const stripe = getStripe();
    const customerId = await resolveStripeCustomerId(stripe, userId, email);

    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan_key: planKey,
        plan_name: plan.name,
        type: 'subscription',
      },
      subscription_data: {
        metadata: { user_id: userId, plan_key: planKey },
      },
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/upgrade`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-upgrade-checkout]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

// ─── POST /api/stripe/create-checkout-session ──────────────────────────────
// Deprecated — subscriptions only.
router.post('/create-checkout-session', authenticateToken, async (_req, res) => {
  return res.status(410).json({
    error: 'Credit packs are no longer available. Please subscribe to Weekly Sprint or Monthly Mastery.',
  });
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

  try {
    const stripe = getStripe();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Personalized Learning PDF
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

      // Subscription checkout — sync subscription; credits granted on invoice.paid
      if (session.mode === 'subscription' && session.subscription) {
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) {
          console.error('[stripe/webhook] subscription checkout missing user_id:', session.id);
          return res.json({ received: true });
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscriptionRecord(userId, subscription);
          await supabaseAdmin
            .from('profiles')
            .update({
              stripe_customer_id: session.customer,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          console.log(`[stripe/webhook] subscription linked — ${subscription.id} for ${userId}`);
        } catch (err) {
          console.error('[stripe/webhook] subscription checkout sync failed:', err.message);
          return res.status(500).json({ error: 'Failed to process subscription checkout.' });
        }

        return res.json({ received: true });
      }

      // Legacy one-time credit packs (deprecated)
      const userId = session.metadata?.user_id || session.client_reference_id;
      const creditsGranted = parseInt(session.metadata?.credits_granted || '0', 10);
      const packName = session.metadata?.pack_name || 'Credit Pack';
      const amountCents = session.amount_total || 0;

      // Public checkout — no user_id in metadata. Look up account by customer email.
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          try {
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            const matched = usersData?.users?.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
            if (matched) resolvedUserId = matched.id;
          } catch (lookupErr) {
            console.error('[stripe/webhook] Email lookup failed:', lookupErr.message);
          }
        }
      }

      if (!resolvedUserId || !creditsGranted) {
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

        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('credits_remaining')
          .eq('id', resolvedUserId)
          .single();

        if (profileError || !profile) {
          console.error('[stripe/webhook] User not found:', resolvedUserId);
          return res.json({ received: true });
        }

        const newBalance = profile.credits_remaining + creditsGranted;

        await Promise.all([
          supabaseAdmin
            .from('profiles')
            .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
            .eq('id', resolvedUserId),
          supabaseAdmin
            .from('payments')
            .upsert({
              user_id: resolvedUserId,
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent,
              amount_cents: amountCents,
              credits_granted: creditsGranted,
              pack_name: packName,
              status: 'completed',
              completed_at: new Date().toISOString(),
            }, { onConflict: 'stripe_session_id' }),
        ]);

        console.log(`[stripe/webhook] +${creditsGranted} credits → user ${resolvedUserId}. Balance: ${profile.credits_remaining} → ${newBalance}`);
      } catch (err) {
        console.error('[stripe/webhook] Processing failed:', err.message);
        return res.status(500).json({ error: 'Failed to process payment.' });
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (!invoice.subscription) return res.json({ received: true });

      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = await findUserIdForSubscription(subscription);
        if (!userId) {
          console.error('[stripe/webhook] invoice.paid — user not found for subscription:', invoice.subscription);
          return res.json({ received: true });
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planKey = getPlanKeyFromPriceId(priceId) || subscription.metadata?.plan_key;
        if (!planKey) {
          console.error('[stripe/webhook] invoice.paid — unknown plan for price:', priceId);
          return res.json({ received: true });
        }

        await grantSubscriptionPeriodCredits(userId, planKey, {
          invoiceId: invoice.id,
          amountCents: invoice.amount_paid,
        });
        await syncSubscriptionRecord(userId, subscription);
      } catch (err) {
        console.error('[stripe/webhook] invoice.paid failed:', err.message);
        return res.status(500).json({ error: 'Failed to process subscription invoice.' });
      }

      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      try {
        const userId = await findUserIdForSubscription(subscription);
        if (!userId) {
          console.error('[stripe/webhook] subscription event — user not found:', subscription.id);
          return res.json({ received: true });
        }
        await syncSubscriptionRecord(userId, subscription);
      } catch (err) {
        console.error('[stripe/webhook] subscription sync failed:', err.message);
        return res.status(500).json({ error: 'Failed to sync subscription.' });
      }

      return res.json({ received: true });
    }
  } catch (err) {
    console.error('[stripe/webhook] Unhandled event error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }

  return res.json({ received: true });
});

// ─── GET /api/stripe/verify-session/:sessionId ────────────────────────────
// Frontend polls this after Stripe redirect to confirm credits were applied
router.get('/verify-session/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;

  try {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('status, credits_granted, pack_name')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (payment?.status === 'completed') {
      return res.json({
        status: payment.status,
        credits_granted: payment.credits_granted,
        pack_name: payment.pack_name,
      });
    }

    // Subscription checkout — poll profile for active subscription + credits
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode === 'subscription' && session.client_reference_id === userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, subscription_plan, credits_remaining, credits_allowance')
        .eq('id', userId)
        .single();

      const plan = profile?.subscription_plan ? getPlanByKey(profile.subscription_plan) : null;
      const creditsReady = profile?.subscription_status === 'active'
        && plan
        && profile.credits_allowance >= plan.credits
        && profile.credits_remaining >= plan.credits;

      if (creditsReady) {
        return res.json({
          status: 'completed',
          credits_granted: profile.credits_remaining,
          pack_name: plan.name,
        });
      }
    }

    return res.json({ status: 'pending' });
  } catch (err) {
    console.error('[stripe/verify-session]', err.message);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;
