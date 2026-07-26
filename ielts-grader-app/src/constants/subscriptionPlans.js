export const FREE_TRIAL_CREDITS = 3;

/**
 * "3 free evaluations" marketing copy — only for free-trial users who still
 * have unused free credits. Hide for admins, subscribers, and anyone with a
 * larger allowance / balance (e.g. admin top-up).
 */
export function showFreeTrialEvalMessage(user) {
  if (!user) return true;
  if (user.is_admin) return false;
  if (user.is_subscribed || user.subscription_status === 'active') return false;
  const remaining = Number(user.credits_remaining) || 0;
  if (remaining <= 0 || remaining > FREE_TRIAL_CREDITS) return false;
  const allowance = Number(user.credits_allowance);
  if (Number.isFinite(allowance) && allowance > FREE_TRIAL_CREDITS) return false;
  return true;
}

export const SUBSCRIPTION_PLANS = {
  weekly: {
    key: 'weekly',
    name: 'Weekly Sprint',
    price: '$5',
    period: '/week',
    credits: 20,
    label: '$5/week',
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Mastery',
    price: '$15',
    period: '/month',
    credits: 80,
    label: '$15/month',
    recommended: true,
  },
};

export const SUBSCRIPTION_FEATURES = [
  '20 full evaluations per week (Weekly) or 80 per month (Monthly)',
  'All task types: Academic & General Training',
  'Detailed band report, fix cards & grammar analysis',
  'Personalized learning guides',
];

export function planKeyFromSelection(selected) {
  return selected === 'Weekly' ? 'weekly' : 'monthly';
}
