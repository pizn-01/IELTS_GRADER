/**
 * One-time credit packs — secondary escape hatch (never expire).
 * Must match backend/src/services/creditPacks.js.
 */
export const CREDIT_PACKS = {
  starter: {
    key: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: '$5',
    label: '$5 one-time',
    description: 'A small top-up when you need a few more evaluations.',
  },
  boost: {
    key: 'boost',
    name: 'Boost Pack',
    credits: 25,
    price: '$12',
    label: '$12 one-time',
    description: 'Larger one-time pack. Subscriptions refill and cost less per exam.',
  },
};

export const CREDIT_PACK_LIST = Object.values(CREDIT_PACKS);

export const CREDIT_PACK_SECTION_HEADING = 'One-time purchase';
export const CREDIT_PACK_NEVER_EXPIRE = 'Never expires';

/** Contrast bullets inside the One-time offer box (full price only — never promo). */
export const ONE_TIME_CONTRAST = [
  'Pay once — no subscription',
  '10 or 25 evaluations',
  'Credits never expire',
  'Best for occasional practice or a top-up',
  'Charged at listed price (no promo codes)',
];

export const ONE_TIME_FEATURES = [
  'Same full band report and fix cards',
  'All task types: Academic & General Training',
  'Credits survive cancelation and renewals',
  'No automatic renewal',
];

export const ONE_TIME_TRUST_LINE =
  'Full price · No subscription · Credits never expire.';
