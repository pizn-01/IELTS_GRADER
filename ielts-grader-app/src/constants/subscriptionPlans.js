export const FREE_TRIAL_CREDITS = 3;

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
