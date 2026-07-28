/**
 * Canonical subscription plan catalog — single source of truth for credits and labels.
 */
const FREE_TRIAL_CREDITS = 2;
/** Highest free-trial allowance ever granted (includes grandfathered 3-credit trials). */
const FREE_TRIAL_ALLOWANCE_MAX = 3;

const SUBSCRIPTION_PLANS = {
  weekly: {
    key: 'weekly',
    name: 'Weekly Sprint',
    credits: 20,
    label: '$5/week',
    amountCents: 500,
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Mastery',
    credits: 80,
    label: '$15/month',
    amountCents: 1500,
  },
};

/** New-user intro: 50% off for the first month (must match Stripe coupon). */
const NEW_USER_PROMO = {
  key: 'new_user_50_first_month',
  percentOff: 50,
  durationMonths: 1,
  badge: '50% off first month',
};

function discountedCents(amountCents, percentOff) {
  return Math.round(amountCents * (100 - percentOff) / 100);
}

function isNewUserPromoConfigured() {
  return Boolean(process.env.STRIPE_COUPON_NEW_USER);
}

function getNewUserPromoPayload({ eligible }) {
  const active = isNewUserPromoConfigured();
  const { percentOff, durationMonths, badge, key } = NEW_USER_PROMO;
  const plans = {};
  for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    plans[planKey] = {
      originalCents: plan.amountCents,
      discountedCents: discountedCents(plan.amountCents, percentOff),
    };
  }
  return {
    key,
    active,
    eligible: Boolean(eligible) && active,
    percentOff,
    durationMonths,
    badge,
    plans,
  };
}

function getPlanByKey(planKey) {
  return SUBSCRIPTION_PLANS[planKey] || null;
}

function getPlanKeyFromPriceId(priceId) {
  if (!priceId) return null;
  const weekly = process.env.STRIPE_PRICE_WEEKLY_SPRINT;
  const monthly = process.env.STRIPE_PRICE_MONTHLY_MASTERY;
  if (priceId === weekly) return 'weekly';
  if (priceId === monthly) return 'monthly';
  return null;
}

function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

module.exports = {
  FREE_TRIAL_CREDITS,
  FREE_TRIAL_ALLOWANCE_MAX,
  SUBSCRIPTION_PLANS,
  NEW_USER_PROMO,
  isNewUserPromoConfigured,
  getNewUserPromoPayload,
  getPlanByKey,
  getPlanKeyFromPriceId,
  getAllPlans,
};
