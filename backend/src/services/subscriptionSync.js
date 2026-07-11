const { supabaseAdmin } = require('./supabase');
const { getPlanByKey, getPlanKeyFromPriceId } = require('./subscriptionPlans');

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

/**
 * End paid access after the subscription period.
 * Clears period_end so the user returns to free-trial rules:
 * credits_remaining=0 (must upgrade or receive admin credits),
 * credits_allowance=1, and exam eligibility follows credits_remaining only.
 */
async function expireSubscriptionAccess(userId) {
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      credits_remaining: 0,
      credits_allowance: 1,
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

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const periodEnded = isPeriodEnded(periodEnd);
  const cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);

  // Access rules:
  // - active/trialing (incl. cancel_at_period_end): keep credits until period ends
  // - past_due: keep remaining credits, surface past_due status
  // - canceled or period ended: credits → 0 (back to free-trial baseline)
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
    // Period ended / fully canceled: back to free-trial baseline (0 credits).
    updates.credits_remaining = 0;
    updates.credits_allowance = 1;
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

  await supabaseAdmin
    .from('profiles')
    .update({
      credits_remaining: plan.credits,
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
    .select('credits_remaining')
    .eq('id', userId)
    .maybeSingle();

  if ((profile?.credits_remaining ?? 0) >= plan.credits) {
    return false;
  }

  return grantSubscriptionPeriodCredits(userId, planKey, {
    invoiceId: invoice.id,
    sessionId,
    amountCents: invoice.amount_paid,
  });
}

async function reconcileUserSubscription(userId) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      stripe_subscription_id,
      stripe_customer_id,
      credits_remaining,
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
  // Free-trial users (no period_end) are untouched — they keep their 1 credit.
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

  const stripe = getStripe();
  if (!stripe || !profile.stripe_subscription_id) {
    return { ...profile, cancel_at_period_end: false };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
      expand: ['latest_invoice'],
    });

    cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
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
  const allowance = profile.credits_allowance ?? 1;
  const plan = profile.subscription_plan ? getPlanByKey(profile.subscription_plan) : null;
  const periodEnded = isPeriodEnded(profile.subscription_period_end);
  const isActive = profile.subscription_status === 'active' && !periodEnded;
  const cancelAtPeriodEnd = !!profile.cancel_at_period_end && isActive;

  return {
    subscription_plan: profile.subscription_plan || null,
    subscription_status: periodEnded ? 'canceled' : (profile.subscription_status || null),
    subscription_period_end: profile.subscription_period_end || null,
    cancel_at_period_end: cancelAtPeriodEnd,
    plan_name: plan?.name || (isActive ? 'Subscription' : 'Free Trial'),
    billing_label: plan?.label || null,
    credits_remaining: periodEnded ? 0 : (profile.credits_remaining ?? 0),
    credits_allowance: periodEnded ? 1 : allowance,
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
  buildSubscriptionStatusPayload,
};
