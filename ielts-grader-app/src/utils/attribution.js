const SESSION_KEY = 'ig_session_id';
const FIRST_TOUCH_KEY = 'ig_first_touch';

const INTERNAL_PATH_PREFIXES = [
  '/admin',
  '/dashboard',
  '/subscription',
  '/settings',
  '/reports',
  '/learning',
  '/mock-exam',
  '/auth',
  '/checkout',
  '/performance',
  '/analysis',
  '/selection',
];

function isInternalPath(path) {
  if (!path || path === '/') return false;
  return INTERNAL_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function publicLandingPath(path) {
  if (!path || isInternalPath(path)) return '/';
  return path;
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

function readUtmParams() {
  const params = new URLSearchParams(window.location.search);
  // Google Ads ValueTrack {campaignid} is a common Final URL suffix when utm_campaign is absent
  const utmCampaign = params.get('utm_campaign') || params.get('campaignid') || null;
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: utmCampaign,
    utm_content: params.get('utm_content') || params.get('adgroupid') || null,
    utm_term: params.get('utm_term') || null,
    gclid: params.get('gclid') || null,
  };
}

function attributionStrength(attrs = {}) {
  if (attrs.gclid || ['cpc', 'ppc', 'paid', 'paidsearch'].includes(String(attrs.utm_medium || '').toLowerCase())) {
    return 3;
  }
  if (attrs.utm_campaign || attrs.utm_source) return 2;
  if (attrs.referrer) return 1;
  return 0;
}

/**
 * Capture first-touch attribution. Paid/campaign signals can upgrade a weak first touch
 * (e.g. earlier direct visit, then Google Ads click) so campaign is not permanently blank.
 */
export function captureFirstTouch() {
  try {
    const path = window.location.pathname;
    if (isInternalPath(path)) return;

    const utm = readUtmParams();
    const existing = getFirstTouch();
    const incoming = {
      landing_path: path,
      referrer: document.referrer || null,
      ...utm,
      captured_at: new Date().toISOString(),
    };

    if (!existing) {
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(incoming));
      return;
    }

    const existingStrength = attributionStrength(existing);
    const incomingStrength = attributionStrength(incoming);
    const shouldUpgrade =
      incomingStrength > existingStrength ||
      (incomingStrength >= 2 && !existing.utm_campaign && incoming.utm_campaign) ||
      (incoming.gclid && !existing.gclid);

    if (!shouldUpgrade) return;

    const upgraded = {
      ...existing,
      referrer: incoming.referrer || existing.referrer,
      utm_source: incoming.utm_source || existing.utm_source,
      utm_medium: incoming.utm_medium || existing.utm_medium,
      utm_campaign: incoming.utm_campaign || existing.utm_campaign,
      utm_content: incoming.utm_content || existing.utm_content,
      utm_term: incoming.utm_term || existing.utm_term,
      gclid: incoming.gclid || existing.gclid,
      // Prefer the paid landing path when upgrading from a weak first touch
      landing_path: existingStrength < 2 && !isInternalPath(path) ? path : existing.landing_path,
      upgraded_at: incoming.captured_at,
    };
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(upgraded));
  } catch {
    // localStorage unavailable
  }
}

export function getFirstTouch() {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Payload for pageview tracking and signup attribution.
 */
export function getAttributionPayload(path = window.location.pathname) {
  captureFirstTouch();
  const firstTouch = getFirstTouch();
  const utm = readUtmParams();
  const hasCurrentUtm = Object.values(utm).some(Boolean);

  return {
    session_id: getOrCreateSessionId(),
    path,
    referrer: firstTouch?.referrer ?? (document.referrer || null),
    landing_path: firstTouch?.landing_path ?? path,
    utm_source: firstTouch?.utm_source ?? utm.utm_source,
    utm_medium: firstTouch?.utm_medium ?? utm.utm_medium,
    utm_campaign: firstTouch?.utm_campaign ?? utm.utm_campaign,
    utm_content: firstTouch?.utm_content ?? utm.utm_content,
    utm_term: firstTouch?.utm_term ?? utm.utm_term,
    gclid: firstTouch?.gclid ?? utm.gclid,
    is_first_touch: !firstTouch && !hasCurrentUtm && !document.referrer,
  };
}

export function getSignupAttribution() {
  captureFirstTouch();
  const firstTouch = getFirstTouch();
  const session_id = getOrCreateSessionId();
  const signupPath = window.location.pathname;
  const currentUtm = readUtmParams();

  if (!firstTouch) {
    return {
      session_id,
      attribution: {
        signup_path: signupPath,
        landing_path: publicLandingPath(signupPath),
        referrer: document.referrer || null,
        ...currentUtm,
      },
    };
  }

  const landingPath = isInternalPath(firstTouch.landing_path)
    ? publicLandingPath(signupPath)
    : firstTouch.landing_path;

  return {
    session_id,
    attribution: {
      signup_path: signupPath,
      landing_path: landingPath,
      referrer: firstTouch.referrer || document.referrer || null,
      utm_source: firstTouch.utm_source || currentUtm.utm_source,
      utm_medium: firstTouch.utm_medium || currentUtm.utm_medium,
      utm_campaign: firstTouch.utm_campaign || currentUtm.utm_campaign,
      utm_content: firstTouch.utm_content || currentUtm.utm_content,
      utm_term: firstTouch.utm_term || currentUtm.utm_term,
      gclid: firstTouch.gclid || currentUtm.gclid,
    },
  };
}
