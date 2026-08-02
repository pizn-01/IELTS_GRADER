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

export const CREDIT_PACK_SECTION_HEADING = 'Prefer a one-time purchase?';
export const CREDIT_PACK_SECTION_SUBHEAD =
  'Credits never expire. Subscriptions refill each period and are better value for ongoing practice.';
export const CREDIT_PACK_NEVER_EXPIRE = 'Never expires';
