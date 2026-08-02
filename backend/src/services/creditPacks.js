/**
 * One-time credit pack catalog — secondary escape hatch vs subscriptions.
 * Packs never expire; promo is blocked after any completed payment (including packs).
 */
const { supabaseAdmin } = require('./supabase');
const { trackProductEvent } = require('../utils/productEvents');
const { FREE_TRIAL_ALLOWANCE_MAX } = require('./subscriptionPlans');

const CREDIT_PACKS = {
  starter: {
    key: 'starter',
    name: 'Starter Pack',
    credits: 10,
    amountCents: 500,
    label: '$5',
    get priceId() {
      return process.env.STRIPE_PRICE_CREDITS_10 || null;
    },
  },
  boost: {
    key: 'boost',
    name: 'Boost Pack',
    credits: 25,
    amountCents: 1200,
    label: '$12',
    get priceId() {
      return process.env.STRIPE_PRICE_CREDITS_25 || null;
    },
  },
};

function getPackByKey(packKey) {
  return CREDIT_PACKS[packKey] || null;
}

function getPackKeyFromPriceId(priceId) {
  if (!priceId) return null;
  for (const pack of Object.values(CREDIT_PACKS)) {
    if (pack.priceId && pack.priceId === priceId) return pack.key;
  }
  return null;
}

function getAllPacks() {
  return Object.values(CREDIT_PACKS).map(({ key, name, credits, amountCents, label }) => ({
    key,
    name,
    credits,
    amountCents,
    label,
  }));
}

/**
 * Grant pack credits into both wallets.
 * credits_remaining += N, pack_credits += N.
 * Idempotent on stripe_session_id.
 */
async function grantPackCredits(userId, packKey, { sessionId, paymentIntent, amountCents } = {}) {
  const pack = getPackByKey(packKey);
  if (!pack) {
    throw new Error(`Unknown credit pack: ${packKey}`);
  }
  if (!sessionId) {
    throw new Error('sessionId required to grant pack credits');
  }

  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .eq('status', 'completed')
    .maybeSingle();

  if (existing) {
    console.log('[creditPacks] Duplicate session skipped:', sessionId);
    return false;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('credits_remaining, pack_credits, credits_allowance')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error(`User not found for pack grant: ${userId}`);
  }

  const packCredits = Number(profile.pack_credits) || 0;
  const remaining = Number(profile.credits_remaining) || 0;
  const currentAllowance = Number(profile.credits_allowance) || 0;
  const nextPack = packCredits + pack.credits;
  const nextRemaining = remaining + pack.credits;

  const updates = {
    credits_remaining: nextRemaining,
    pack_credits: nextPack,
    updated_at: new Date().toISOString(),
  };
  // Free-trial / pack-only users: raise display allowance so remaining/allowance is coherent.
  // Subscribers keep plan allowance (period allotment).
  if (currentAllowance <= FREE_TRIAL_ALLOWANCE_MAX) {
    updates.credits_allowance = Math.max(currentAllowance, nextRemaining);
  }

  await Promise.all([
    supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId),
    supabaseAdmin
      .from('payments')
      .upsert(
        {
          user_id: userId,
          stripe_session_id: sessionId,
          stripe_payment_intent: paymentIntent || null,
          amount_cents: amountCents ?? pack.amountCents,
          credits_granted: pack.credits,
          pack_name: pack.name,
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_session_id' },
      ),
  ]);

  trackProductEvent({
    eventName: 'payment_completed',
    userId,
    properties: {
      pack_key: pack.key,
      pack_name: pack.name,
      amount_cents: amountCents ?? pack.amountCents,
      credits_granted: pack.credits,
      stripe_session_id: sessionId,
      type: 'credit_pack',
    },
  }).catch(() => {});

  console.log(
    `[creditPacks] +${pack.credits} pack credits (${pack.name}) → user ${userId}. `
    + `remaining ${remaining}→${nextRemaining}, pack ${packCredits}→${nextPack}`,
  );
  return true;
}

/**
 * Period (subscription) portion of the combined wallet.
 * period = max(0, credits_remaining - pack_credits)
 */
function periodCreditsFromProfile(profile) {
  const remaining = Number(profile?.credits_remaining) || 0;
  const pack = Math.min(Number(profile?.pack_credits) || 0, remaining);
  return Math.max(0, remaining - pack);
}

/**
 * Spend one credit: period wallet first, then pack.
 * Returns { ok, from: 'period'|'pack', previousRemaining, previousPack } or { ok: false, reason }.
 */
async function spendOneCredit(userId, profile) {
  const remaining = Number(profile.credits_remaining) || 0;
  const packCredits = Math.min(Number(profile.pack_credits) || 0, remaining);

  if (remaining <= 0) {
    return { ok: false, reason: 'insufficient' };
  }

  const period = remaining - packCredits;
  const fromPack = period <= 0;
  const nextRemaining = remaining - 1;
  const nextPack = fromPack ? packCredits - 1 : packCredits;

  const updates = {
    credits_remaining: nextRemaining,
    updated_at: new Date().toISOString(),
  };
  if (fromPack) {
    updates.pack_credits = nextPack;
  }

  let query = supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .eq('credits_remaining', remaining);

  if (fromPack) {
    query = query.eq('pack_credits', packCredits);
  }

  const { error, count } = await query.select('*', { count: 'exact' });

  if (error) {
    return { ok: false, reason: 'update_failed', error };
  }
  if (count === 0) {
    return { ok: false, reason: 'conflict' };
  }

  return {
    ok: true,
    from: fromPack ? 'pack' : 'period',
    previousRemaining: remaining,
    previousPack: packCredits,
  };
}

/** Restore a credit after a failed spend path. */
async function restoreSpentCredit(userId, spendResult) {
  if (!spendResult?.ok) return false;
  const updates = {
    credits_remaining: spendResult.previousRemaining,
    updated_at: new Date().toISOString(),
  };
  if (spendResult.from === 'pack') {
    updates.pack_credits = spendResult.previousPack;
  }
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return !error;
}

module.exports = {
  CREDIT_PACKS,
  getPackByKey,
  getPackKeyFromPriceId,
  getAllPacks,
  grantPackCredits,
  periodCreditsFromProfile,
  spendOneCredit,
  restoreSpentCredit,
};
