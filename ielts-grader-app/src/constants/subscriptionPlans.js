export const FREE_TRIAL_CREDITS = 2;
/** Highest free-trial allowance ever granted (includes grandfathered 3-credit trials). */
export const FREE_TRIAL_ALLOWANCE_MAX = 3;

/**
 * True for non-admin, non-subscribed users whose allowance is within free-trial range
 * (current grant or grandfathered 3-credit trials). Admin top-ups / paid packs exceed the max.
 */
export function isFreeTrialUser(user) {
  if (!user) return false;
  if (user.is_admin) return false;
  if (user.is_subscribed || user.subscription_status === 'active') return false;
  const allowance = Number(user.credits_allowance);
  if (Number.isFinite(allowance) && allowance > FREE_TRIAL_ALLOWANCE_MAX) return false;
  return true;
}

/**
 * "Free evaluations" marketing copy — logged-out visitors, or free-trial users who still
 * have unused free credits. Hide for admins, subscribers, and paid/top-up allowances.
 */
export function showFreeTrialEvalMessage(user) {
  if (!user) return true;
  if (!isFreeTrialUser(user)) return false;
  const remaining = Number(user.credits_remaining) || 0;
  return remaining > 0;
}

/** Must match backend NEW_USER_PROMO + Stripe coupon (50% repeating 1 month). */
export const NEW_USER_PROMO = {
  key: 'new_user_50_first_month',
  percentOff: 50,
  durationMonths: 1,
  badge: '50% off first month',
};

export const SUBSCRIPTION_PLANS = {
  weekly: {
    key: 'weekly',
    name: 'Weekly Sprint',
    /** Sale price while new-user campaign is live (CTAs use this). */
    price: '$2.50',
    originalPrice: '$5',
    salePrice: '$2.50',
    period: '/week',
    credits: 20,
    label: '$2.50/week',
    originalLabel: '$5/week',
    promoBadge: NEW_USER_PROMO.badge,
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Mastery',
    price: '$7.50',
    originalPrice: '$15',
    salePrice: '$7.50',
    period: '/month',
    credits: 80,
    label: '$7.50/month',
    originalLabel: '$15/month',
    promoBadge: NEW_USER_PROMO.badge,
    recommended: true,
  },
};

/** Full-price labels when the user is not promo-eligible. */
export const FULL_PRICE_PLANS = {
  weekly: {
    price: '$5',
    label: '$5/week',
  },
  monthly: {
    price: '$15',
    label: '$15/month',
  },
};

/**
 * Display amounts for a plan card.
 * @param {object} plan — entry from SUBSCRIPTION_PLANS
 * @param {{ showPromo?: boolean }} [opts]
 */
export function formatPromoPrice(plan, { showPromo = true } = {}) {
  if (showPromo && plan.salePrice && plan.originalPrice) {
    return {
      displayPrice: plan.salePrice,
      originalPrice: plan.originalPrice,
      period: plan.period,
      badge: plan.promoBadge || NEW_USER_PROMO.badge,
      showPromo: true,
    };
  }
  const full = FULL_PRICE_PLANS[plan.key];
  return {
    displayPrice: full?.price || plan.originalPrice || plan.price,
    originalPrice: null,
    period: plan.period,
    badge: null,
    showPromo: false,
  };
}

export const SUBSCRIPTION_FEATURES = [
  '20 full evaluations per week (Weekly) or 80 per month (Monthly)',
  'All task types: Academic & General Training',
  'Detailed band report, fix cards & grammar analysis',
  'Personalized learning guides',
];

/** Shown where the old Academic/GT toggle sat — plan covers both. */
export const SUBSCRIPTION_PLAN_NOTE =
  'One plan covers Academic & General Training · Instant access · Cancel anytime';

export function planKeyFromSelection(selected) {
  return selected === 'Weekly' ? 'weekly' : 'monthly';
}
