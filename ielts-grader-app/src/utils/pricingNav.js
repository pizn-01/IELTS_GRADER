/**
 * Single in-app pay shop = /upgrade. Public marketing shop = /pricing.
 */

export function buildUpgradeShopPath({
  from = 'upgrade',
  plan = 'monthly',
  checkout = false,
  pack = null,
} = {}) {
  const params = new URLSearchParams();
  if (plan === 'weekly' || plan === 'monthly') params.set('plan', plan);
  if (from) params.set('from', from);
  if (pack === 'starter' || pack === 'boost') params.set('pack', pack);
  if (checkout) params.set('checkout', '1');
  const qs = params.toString();
  return qs ? `/upgrade?${qs}` : '/upgrade';
}

export function buildPublicPricingPath({
  plan = 'monthly',
  checkout = false,
  pack = null,
} = {}) {
  const params = new URLSearchParams();
  if (plan === 'weekly' || plan === 'monthly') params.set('plan', plan);
  if (pack === 'starter' || pack === 'boost') params.set('pack', pack);
  if (checkout) params.set('checkout', '1');
  const qs = params.toString();
  return qs ? `/pricing?${qs}` : '/pricing';
}

/** Logged-in: always /upgrade. Logged-out soft links: /pricing. */
export function goToPayShop({
  navigate,
  isAuthenticated,
  from = 'upgrade',
  plan = 'monthly',
  checkout = false,
  pack = null,
  replace = false,
}) {
  const path = isAuthenticated
    ? buildUpgradeShopPath({ from, plan, checkout, pack })
    : buildPublicPricingPath({ plan, checkout, pack });
  navigate(path, { replace });
}

export function goToUpgradeShop({
  navigate,
  from = 'upgrade',
  plan = 'monthly',
  checkout = false,
  pack = null,
  replace = false,
}) {
  navigate(buildUpgradeShopPath({ from, plan, checkout, pack }), { replace });
}

export function goToPublicPricing({
  navigate,
  plan = 'monthly',
  checkout = false,
  pack = null,
  replace = false,
}) {
  navigate(buildPublicPricingPath({ plan, checkout, pack }), { replace });
}

export function intentBannerForFrom(from) {
  if (from === 'out_of_credits') {
    return {
      title: "You're out of evaluations",
      body: 'Choose Premium for refills each period, or a one-time pack that never expires.',
    };
  }
  if (from === 'report') {
    return {
      title: 'Keep practicing with full evaluations',
      body: 'Pick Premium or a one-time pack — same detailed reports either way.',
    };
  }
  return null;
}

const SAFE_CANCEL_FROM = new Set(['out_of_credits', 'upgrade', 'report']);

/**
 * Sanitize cancel path: only /pricing|/upgrade + safe query (no checkout).
 * Prevents Stripe Cancel from re-firing auto-checkout.
 */
export function sanitizeCancelPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '/upgrade';
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/upgrade';
  if (trimmed.includes('://') || trimmed.includes('\\')) return '/upgrade';

  const qIndex = trimmed.indexOf('?');
  const pathOnly = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  if (pathOnly !== '/pricing' && pathOnly !== '/upgrade') return '/upgrade';

  const search = qIndex >= 0 ? trimmed.slice(qIndex + 1) : '';
  if (!search) return pathOnly;

  const incoming = new URLSearchParams(search);
  const outgoing = new URLSearchParams();
  const plan = incoming.get('plan');
  if (plan === 'weekly' || plan === 'monthly') outgoing.set('plan', plan);
  const from = incoming.get('from');
  if (SAFE_CANCEL_FROM.has(from)) outgoing.set('from', from);
  const pack = incoming.get('pack');
  if (pack === 'starter' || pack === 'boost') outgoing.set('pack', pack);

  const qs = outgoing.toString();
  return qs ? `${pathOnly}?${qs}` : pathOnly;
}

/** Current location for Stripe cancel_url — never includes checkout=1. */
export function cancelPathForCheckout() {
  if (typeof window === 'undefined') return '/upgrade';
  const { pathname, search } = window.location;
  return sanitizeCancelPath(`${pathname}${search || ''}`);
}

/** @deprecated Prefer cancelPathForCheckout — strips checkout automatically. */
export function currentCancelPath() {
  return cancelPathForCheckout();
}
