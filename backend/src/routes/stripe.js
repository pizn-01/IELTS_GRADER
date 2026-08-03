const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');
const {
  SUBSCRIPTION_PLANS,
  NEW_USER_PROMO,
  isNewUserPromoConfigured,
  getPlanByKey,
  getPlanKeyFromPriceId,
} = require('../services/subscriptionPlans');
const {
  findUserIdForSubscription,
  syncSubscriptionRecord,
  grantSubscriptionPeriodCredits,
  grantCreditsFromSubscription,
} = require('../services/subscriptionSync');
const {
  getPackByKey,
  getPackKeyFromPriceId,
  grantPackCredits,
} = require('../services/creditPacks');
const { trackProductEvent } = require('../utils/productEvents');

const router = express.Router();

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

/**
 * Allow only /pricing or /upgrade (+ safe query) as Stripe cancel destinations.
 * Drops checkout=1 and unknown params so Cancel cannot re-fire auto-checkout.
 */
function resolveCancelUrl(cancelPath) {
  const fallback = `${FRONTEND_URL}/upgrade`;
  if (!cancelPath || typeof cancelPath !== 'string') return fallback;
  const trimmed = cancelPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('://') || trimmed.includes('\\')) return fallback;
  if (trimmed.length > 256) return fallback;

  const qIndex = trimmed.indexOf('?');
  const pathOnly = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  if (pathOnly !== '/pricing' && pathOnly !== '/upgrade') return fallback;

  const search = qIndex >= 0 ? trimmed.slice(qIndex + 1) : '';
  if (!search) return `${FRONTEND_URL}${pathOnly}`;

  const incoming = new URLSearchParams(search);
  const outgoing = new URLSearchParams();
  const plan = incoming.get('plan');
  if (plan === 'weekly' || plan === 'monthly') outgoing.set('plan', plan);
  const from = incoming.get('from');
  if (from === 'out_of_credits' || from === 'upgrade' || from === 'report') {
    outgoing.set('from', from);
  }
  const pack = incoming.get('pack');
  if (pack === 'starter' || pack === 'boost') outgoing.set('pack', pack);
  // checkout and any other keys are dropped

  const qs = outgoing.toString();
  return qs ? `${FRONTEND_URL}${pathOnly}?${qs}` : `${FRONTEND_URL}${pathOnly}`;
}

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
  const flow = req.body?.flow === 'subscription_update' ? 'subscription_update' : 'manage';

  if (!email) {
    return res.status(400).json({ error: 'Account email is required to manage billing.' });
  }

  try {
    const stripe = getStripe();
    const customerId = await resolveStripeCustomerId(stripe, userId, email);

    const sessionParams = {
      customer: customerId,
      return_url: `${FRONTEND_URL}/subscription`,
    };

    if (flow === 'subscription_update') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_subscription_id, subscription_status')
        .eq('id', userId)
        .maybeSingle();

      if (!profile?.stripe_subscription_id || profile.subscription_status !== 'active') {
        return res.status(400).json({ error: 'No active subscription found to update.' });
      }

      sessionParams.flow_data = {
        type: 'subscription_update',
        subscription_update: {
          subscription: profile.stripe_subscription_id,
        },
      };
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-billing-portal-session]', err.message);
    return res.status(500).json({ error: 'Failed to open billing portal. Please try again.' });
  }
});

// ─── POST /api/stripe/create-public-checkout ──────────────────────────────
// Deprecated — subscriptions only. Kept for backwards compatibility.
router.post('/create-public-checkout', async (_req, res) => {
  return res.status(410).json({ error: 'One-time checkout is no longer available. Choose a plan on Pricing or Upgrade.' });
});

// ─── POST /api/stripe/create-upgrade-checkout ────────────────────────────────
// Authenticated subscription checkout for Weekly Sprint / Monthly Mastery plans
router.post('/create-upgrade-checkout', authenticateToken, async (req, res) => {
  const { plan: planKey, cancel_path: cancelPath } = req.body;
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

    const [{ data: profile }, { count: paymentCount }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('subscription_status, subscription_period_end')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed'),
    ]);

    const periodEnded = profile?.subscription_period_end
      && new Date(profile.subscription_period_end) <= new Date();
    const isSubscribed = profile?.subscription_status === 'active' && !periodEnded;

    if (isSubscribed) {
      return res.status(400).json({
        error: 'You already have an active subscription. Manage it from Your Subscription.',
      });
    }

    const hasPaid = isSubscribed || (paymentCount ?? 0) > 0;
    const promoEligible = !hasPaid && isNewUserPromoConfigured();
    const couponId = process.env.STRIPE_COUPON_NEW_USER;

    if (!hasPaid && !isNewUserPromoConfigured()) {
      console.warn(
        '[stripe/create-upgrade-checkout] New-user promo eligible but STRIPE_COUPON_NEW_USER is not set; charging full price.'
      );
    }

    const sessionParams = {
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
        ...(promoEligible ? { promo: NEW_USER_PROMO.key } : {}),
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_key: planKey,
          ...(promoEligible ? { promo: NEW_USER_PROMO.key } : {}),
        },
      },
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: resolveCancelUrl(cancelPath),
    };

    if (promoEligible) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    trackProductEvent({
      eventName: 'checkout_started',
      userId,
      properties: {
        plan_key: planKey,
        stripe_session_id: session.id,
        promo: promoEligible ? NEW_USER_PROMO.key : null,
      },
    }).catch(() => {});

    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-upgrade-checkout]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

// ─── POST /api/stripe/create-pack-checkout ───────────────────────────────────
// Authenticated one-time credit pack checkout (starter 10/$5, boost 25/$12)
router.post('/create-pack-checkout', authenticateToken, async (req, res) => {
  const { pack: packKey, cancel_path: cancelPath } = req.body;
  const userId = req.user.userId;
  const email = req.user.email;

  const pack = getPackByKey(packKey);
  if (!pack) return res.status(400).json({ error: 'Invalid credit pack.' });

  const priceId = pack.priceId;
  if (!priceId) {
    console.error(`[stripe/create-pack-checkout] Missing env price for pack: ${packKey}`);
    return res.status(500).json({ error: 'Credit pack not configured. Contact support.' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Account email is required for checkout.' });
  }

  try {
    const stripe = getStripe();
    const customerId = await resolveStripeCustomerId(stripe, userId, email);

    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      // Packs are always full price — never attach coupons or allow promo codes.
      allow_promotion_codes: false,
      metadata: {
        user_id: userId,
        pack_key: pack.key,
        pack_name: pack.name,
        credits_granted: String(pack.credits),
        type: 'credit_pack',
      },
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: resolveCancelUrl(cancelPath),
    });

    trackProductEvent({
      eventName: 'checkout_started',
      userId,
      properties: {
        pack_key: pack.key,
        stripe_session_id: session.id,
        type: 'credit_pack',
      },
    }).catch(() => {});

    return res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-pack-checkout]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session. ' + err.message });
  }
});

// ─── POST /api/stripe/create-checkout-session ──────────────────────────────
// Deprecated legacy packs endpoint — use create-pack-checkout.
router.post('/create-checkout-session', authenticateToken, async (_req, res) => {
  return res.status(410).json({
    error: 'This checkout endpoint is deprecated. Use /create-pack-checkout, or subscribe via Pricing or Upgrade.',
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
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['latest_invoice'],
          });
          await syncSubscriptionRecord(userId, subscription);
          await grantCreditsFromSubscription(subscription, userId, { sessionId: session.id });
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

      // One-time credit packs (starter / boost)
      if (session.metadata?.type === 'credit_pack') {
        const userId = session.metadata?.user_id || session.client_reference_id;
        const packKey = session.metadata?.pack_key
          || getPackKeyFromPriceId(session.line_items?.data?.[0]?.price?.id)
          || null;

        if (!userId || !packKey) {
          console.error('[stripe/webhook] credit_pack missing user_id or pack_key:', session.id);
          return res.json({ received: true });
        }

        try {
          await grantPackCredits(userId, packKey, {
            sessionId: session.id,
            paymentIntent: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
            amountCents: session.amount_total || undefined,
          });
          if (session.customer) {
            await supabaseAdmin
              .from('profiles')
              .update({
                stripe_customer_id: session.customer,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
        } catch (err) {
          console.error('[stripe/webhook] credit_pack processing failed:', err.message);
          return res.status(500).json({ error: 'Failed to process credit pack payment.' });
        }

        return res.json({ received: true });
      }

      // Legacy one-time credit packs (deprecated price IDs / old metadata)
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
        // Prefer pack_key when present; otherwise grant into both wallets as legacy pack.
        const packKey = session.metadata?.pack_key;
        if (packKey && getPackByKey(packKey)) {
          await grantPackCredits(resolvedUserId, packKey, {
            sessionId: session.id,
            paymentIntent: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
            amountCents,
          });
          return res.json({ received: true });
        }

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
          .select('credits_remaining, pack_credits')
          .eq('id', resolvedUserId)
          .single();

        if (profileError || !profile) {
          console.error('[stripe/webhook] User not found:', resolvedUserId);
          return res.json({ received: true });
        }

        const packCredits = (Number(profile.pack_credits) || 0) + creditsGranted;
        const newBalance = (Number(profile.credits_remaining) || 0) + creditsGranted;

        await Promise.all([
          supabaseAdmin
            .from('profiles')
            .update({
              credits_remaining: newBalance,
              pack_credits: packCredits,
              updated_at: new Date().toISOString(),
            })
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
        type: 'credit_pack',
        credits_granted: payment.credits_granted,
        pack_name: payment.pack_name,
      });
    }

    // Subscription checkout — poll profile for active subscription + credits
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode === 'subscription' && session.client_reference_id === userId) {
      const { reconcileUserSubscription } = require('../services/subscriptionSync');
      const refreshed = await reconcileUserSubscription(userId);

      const plan = refreshed?.subscription_plan ? getPlanByKey(refreshed.subscription_plan) : null;
      const creditsReady = refreshed?.subscription_status === 'active'
        && plan
        && refreshed.credits_allowance >= plan.credits
        && refreshed.credits_remaining >= plan.credits;

      if (creditsReady) {
        return res.json({
          status: 'completed',
          type: 'subscription',
          credits_granted: plan.credits,
          pack_name: plan.name,
          plan_key: refreshed.subscription_plan,
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
