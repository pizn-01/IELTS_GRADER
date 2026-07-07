const { supabaseAdmin } = require('./supabase');
const { getPlanByKey, getPlanKeyFromPriceId } = require('./subscriptionPlans');

function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') return 'canceled';
  return stripeStatus;
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

  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const updates = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId || null,
    subscription_status: mappedStatus,
    subscription_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };

  if (planKey) updates.subscription_plan = planKey;
  if (plan) updates.credits_allowance = plan.credits;

  if (mappedStatus === 'canceled' && periodEnd && new Date(periodEnd) <= new Date()) {
    updates.credits_remaining = 0;
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

function buildSubscriptionStatusPayload(profile) {
  const allowance = profile.credits_allowance ?? 1;
  const plan = profile.subscription_plan ? getPlanByKey(profile.subscription_plan) : null;
  const isActive = profile.subscription_status === 'active';

  return {
    subscription_plan: profile.subscription_plan || null,
    subscription_status: profile.subscription_status || null,
    subscription_period_end: profile.subscription_period_end || null,
    plan_name: plan?.name || (isActive ? 'Subscription' : 'Free Trial'),
    billing_label: plan?.label || null,
    credits_remaining: profile.credits_remaining ?? 0,
    credits_allowance: allowance,
    is_subscribed: isActive,
    has_paid: isActive || (profile.has_paid ?? false),
  };
}

module.exports = {
  mapStripeSubscriptionStatus,
  findUserIdForSubscription,
  syncSubscriptionRecord,
  grantSubscriptionPeriodCredits,
  buildSubscriptionStatusPayload,
};
