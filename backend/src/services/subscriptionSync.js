const { supabaseAdmin } = require('./supabase');
const { FREE_TRIAL_CREDITS, getPlanByKey, getPlanKeyFromPriceId } = require('./subscriptionPlans');
const { trackProductEvent } = require('../utils/productEvents');

let _stripe = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'canceled';
  return stripeStatus;
}

function isPeriodEnded(periodEndIso) {
  return Boolean(periodEndIso && new Date(periodEndIso) <= new Date());
}

/** Stripe API may put period bounds on the subscription or on its items. */
function getSubscriptionPeriodEndUnix(subscription) {
  if (subscription?.current_period_end) return subscription.current_period_end;
  const itemEnd = subscription?.items?.data?.[0]?.current_period_end;
  if (itemEnd) return itemEnd;
  // Scheduled cancel timestamp is the access end when cancel_at is set.
  if (subscription?.cancel_at) return subscription.cancel_at;
  return null;
}

function isCancelScheduled(subscription) {
  if (!subscription) return false;
  if (subscription.cancel_at_period_end) return true;
  const status = subscription.status;
  if (subscription.cancel_at && (status === 'active' || status === 'trialing')) return true;
  return false;
}

/**
 * End paid access after the subscription period.
 * Clears period credits but preserves never-expiring pack_credits:
 * credits_remaining = pack_credits, credits_allowance = FREE_TRIAL_CREDITS.
 */
async function expireSubscriptionAccess(userId) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('pack_credits')
    .eq('id', userId)
    .maybeSingle();

  const packCredits = Math.max(0, Number(profile?.pack_credits) || 0);

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      credits_remaining: packCredits,
      pack_credits: packCredits,
      credits_allowance: FREE_TRIAL_CREDITS,
      subscription_plan: null,
      subscription_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function findUserIdForSubscription(subscription) {
  const metaUserId = subscription.metadata?.user_id;
  if (metaUserId) return metaUserId;

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  if (customerId) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

async function syncSubscriptionRecord(userId, subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planKey = getPlanKeyFromPriceId(priceId)
    || subscription.metadata?.plan_key
    || null;
  const plan = planKey ? getPlanByKey(planKey) : null;

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const periodEndUnix = getSubscriptionPeriodEndUnix(subscription);
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;
  const periodEnded = isPeriodEnded(periodEnd);
  const cancelAtPeriodEnd = isCancelScheduled(subscription);
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);

  // Access rules:
  // - active/trialing (incl. cancel_at_period_end / cancel_at): keep credits until period ends
  // - past_due: keep remaining credits, surface past_due status
  // - canceled or period ended: period credits cleared; pack_credits preserved
  let effectiveStatus = mappedStatus;
  if (periodEnded) {
    effectiveStatus = 'canceled';
  } else if (subscription.status === 'canceled') {
    effectiveStatus = 'canceled';
  } else if (cancelAtPeriodEnd && (subscription.status === 'active' || subscription.status === 'trialing')) {
    effectiveStatus = 'active';
  } else if (mappedStatus === 'past_due') {
    effectiveStatus = 'past_due';
  }

  const updates = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId || null,
    subscription_status: effectiveStatus,
    subscription_period_end: periodEnded ? null : periodEnd,
    updated_at: new Date().toISOString(),
  };

  if (effectiveStatus === 'active' || effectiveStatus === 'past_due') {
    if (planKey) updates.subscription_plan = planKey;
    if (plan) updates.credits_allowance = plan.credits;
    // Do NOT zero credits on past_due — user keeps remaining period credits.
  } else {
    // Period ended / fully canceled: keep never-expiring pack wallet only.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pack_credits')
      .eq('id', userId)
      .maybeSingle();
    const packCredits = Math.max(0, Number(profile?.pack_credits) || 0);
    updates.credits_remaining = packCredits;
    updates.pack_credits = packCredits;
    updates.credits_allowance = FREE_TRIAL_CREDITS;
    updates.subscription_plan = null;
    updates.subscription_period_end = null;
  }

  await supabaseAdmin.from('profiles').update(updates).eq('id', userId);
}

async function grantSubscriptionPeriodCredits(userId, planKey, { invoiceId, sessionId, amountCents } = {}) {
  const plan = getPlanByKey(planKey);
  if (!plan) {
    throw new Error(`Unknown subscription plan: ${planKey}`);
  }

  if (invoiceId) {
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('stripe_invoice_id', invoiceId)
      .maybeSingle();
    if (existing) {
      console.log('[subscription] Duplicate invoice skipped:', invoiceId);
      return false;
    }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('pack_credits')
    .eq('id', userId)
    .maybeSingle();
  const packCredits = Math.max(0, Number(profile?.pack_credits) || 0);

  await supabaseAdmin
    .from('profiles')
    .update({
      // Renew sets period allotment and preserves never-expiring pack wallet.
      credits_remaining: plan.credits + packCredits,
      pack_credits: packCredits,
      credits_allowance: plan.credits,
      subscription_plan: planKey,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  const paymentRow = {
    user_id: userId,
    stripe_session_id: sessionId || (invoiceId ? `invoice_${invoiceId}` : `sub_${userId}_${Date.now()}`),
    stripe_invoice_id: invoiceId || null,
    stripe_payment_intent: null,
    amount_cents: amountCents ?? plan.amountCents,
    credits_granted: plan.credits,
    pack_name: plan.name,
    status: 'completed',
    completed_at: new Date().toISOString(),
  };

  await supabaseAdmin
    .from('payments')
    .upsert(paymentRow, { onConflict: 'stripe_session_id' });

  trackProductEvent({
    eventName: 'payment_completed',
    userId,
    properties: {
      plan_key: planKey,
      pack_name: plan.name,
      amount_cents: paymentRow.amount_cents,
      stripe_session_id: paymentRow.stripe_session_id,
    },
  }).catch(() => {});

  console.log(`[subscription] Granted ${plan.credits} credits (${plan.name}) → user ${userId}`);
  return true;
}

async function grantCreditsFromSubscription(subscription, userId, { sessionId } = {}) {
  const planKey = getPlanKeyFromPriceId(subscription.items?.data?.[0]?.price?.id)
    || subscription.metadata?.plan_key;
  if (!planKey) return false;

  const plan = getPlanByKey(planKey);
  if (!plan) return false;

  const latestInvoice = subscription.latest_invoice;
  const invoice = typeof latestInvoice === 'object' ? latestInvoice : null;
  if (!invoice || invoice.status !== 'paid') return false;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('credits_remaining, pack_credits')
    .eq('id', userId)
    .maybeSingle();

  // Compare period portion only — pack balance must not block renew grants.
  const packCredits = Math.max(0, Number(profile?.pack_credits) || 0);
  const remaining = Number(profile?.credits_remaining) || 0;
  const periodCredits = Math.max(0, remaining - Math.min(packCredits, remaining));
  if (periodCredits >= plan.credits) {
    return false;
  }

  return grantSubscriptionPeriodCredits(userId, planKey, {
    invoiceId: invoice.id,
    sessionId,
    amountCents: invoice.amount_paid,
  });
}

/**
 * Reconcile subscription state from the DB, optionally refreshing from Stripe.
 * liveStripe=false is for hot paths like GET /auth/me (called many times per
 * page load). Stripe webhooks + login/subscription endpoints keep the DB fresh;
 * /me only needs local period-end expiry.
 */
async function reconcileUserSubscription(userId, { liveStripe = true } = {}) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      stripe_subscription_id,
      stripe_customer_id,
      credits_remaining,
      pack_credits,
      credits_allowance,
      subscription_status,
      subscription_plan,
      subscription_period_end
    `)
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return null;

  let cancelAtPeriodEnd = false;

  // Only expire paid access when a subscription period has actually ended.
  // Free-trial users (no period_end) are untouched — they keep their free-trial credits.
  if (
    isPeriodEnded(profile.subscription_period_end)
    && (profile.subscription_status === 'active'
      || profile.subscription_status === 'past_due'
      || profile.stripe_subscription_id)
  ) {
    await expireSubscriptionAccess(userId);
    const { data: refreshed } = await supabaseAdmin
      .from('profiles')
      .select(`
        credits_remaining,
        pack_credits,
        credits_allowance,
        subscription_plan,
        subscription_status,
        subscription_period_end,
        stripe_subscription_id
      `)
      .eq('id', userId)
      .single();
    return { ...refreshed, cancel_at_period_end: false };
  }

  if (!liveStripe) {
    return { ...profile, cancel_at_period_end: false };
  }

  const stripe = getStripe();
  if (!stripe || !profile.stripe_subscription_id) {
    return { ...profile, cancel_at_period_end: false };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
      expand: ['latest_invoice'],
    });

    cancelAtPeriodEnd = isCancelScheduled(subscription);
    await syncSubscriptionRecord(userId, subscription);

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await grantCreditsFromSubscription(subscription, userId);
    }
  } catch (err) {
    if (err?.code === 'resource_missing' && isPeriodEnded(profile.subscription_period_end)) {
      await expireSubscriptionAccess(userId);
    } else {
      console.error('[subscription] reconcile failed:', err.message);
    }
  }

  const { data: refreshed } = await supabaseAdmin
    .from('profiles')
    .select(`
      credits_remaining,
      pack_credits,
      credits_allowance,
      subscription_plan,
      subscription_status,
      subscription_period_end,
      stripe_subscription_id
    `)
    .eq('id', userId)
    .single();

  return { ...refreshed, cancel_at_period_end: cancelAtPeriodEnd };
}

function buildSubscriptionStatusPayload(profile) {
  const allowance = profile.credits_allowance ?? FREE_TRIAL_CREDITS;
  const plan = profile.subscription_plan ? getPlanByKey(profile.subscription_plan) : null;
  const periodEnded = isPeriodEnded(profile.subscription_period_end);
  const isActive = profile.subscription_status === 'active' && !periodEnded;
  const cancelAtPeriodEnd = !!profile.cancel_at_period_end && isActive;
  const creditsAllowance = periodEnded || !isActive
    ? Math.max(allowance, FREE_TRIAL_CREDITS)
    : allowance;
  const packCredits = Math.max(0, Number(profile.pack_credits) || 0);
  // After period end (before reconcile expire writes), surface pack wallet only.
  const creditsRemaining = periodEnded
    ? packCredits
    : (profile.credits_remaining ?? 0);

  return {
    subscription_plan: profile.subscription_plan || null,
    subscription_status: periodEnded ? 'canceled' : (profile.subscription_status || null),
    subscription_period_end: profile.subscription_period_end || null,
    cancel_at_period_end: cancelAtPeriodEnd,
    plan_name: plan?.name || (isActive ? 'Subscription' : 'Free Trial'),
    billing_label: plan?.label || null,
    credits_remaining: creditsRemaining,
    pack_credits: packCredits,
    credits_allowance: periodEnded ? FREE_TRIAL_CREDITS : creditsAllowance,
    is_subscribed: isActive,
    has_paid: isActive || (profile.has_paid ?? false),
  };
}

module.exports = {
  mapStripeSubscriptionStatus,
  findUserIdForSubscription,
  syncSubscriptionRecord,
  grantSubscriptionPeriodCredits,
  grantCreditsFromSubscription,
  reconcileUserSubscription,
  expireSubscriptionAccess,
  isPeriodEnded,
  getSubscriptionPeriodEndUnix,
  isCancelScheduled,
  buildSubscriptionStatusPayload,
};
