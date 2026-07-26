/**
 * Canonical subscription plan catalog — single source of truth for credits and labels.
 */
const FREE_TRIAL_CREDITS = 3;

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
  SUBSCRIPTION_PLANS,
  getPlanByKey,
  getPlanKeyFromPriceId,
  getAllPlans,
};
