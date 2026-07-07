/**
 * Canonical subscription plan catalog — single source of truth for credits and labels.
 */
const SUBSCRIPTION_PLANS = {
  weekly: {
    key: 'weekly',
    name: 'Weekly Sprint',
    credits: 20,
    label: '$1.00/week',
    amountCents: 100,
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Mastery',
    credits: 100,
    label: '$1.50/month',
    amountCents: 150,
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
  SUBSCRIPTION_PLANS,
  getPlanByKey,
  getPlanKeyFromPriceId,
  getAllPlans,
};
