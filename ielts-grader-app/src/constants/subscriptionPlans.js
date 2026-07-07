export const SUBSCRIPTION_PLANS = {
  weekly: {
    key: 'weekly',
    name: 'Weekly Sprint',
    price: '$1.00',
    period: '/week',
    credits: 20,
    label: '$1.00/week',
  },
  monthly: {
    key: 'monthly',
    name: 'Monthly Mastery',
    price: '$1.50',
    period: '/month',
    credits: 100,
    label: '$1.50/month',
    recommended: true,
  },
};

export const SUBSCRIPTION_FEATURES = [
  '20 full evaluations per week (Weekly) or 100 per month (Monthly)',
  'All task types — Academic & General Training',
  'Detailed band report, fix cards & grammar analysis',
  'Personalized learning guides',
];

export function planKeyFromSelection(selected) {
  return selected === 'Weekly' ? 'weekly' : 'monthly';
}
