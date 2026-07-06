const SESSION_KEY = 'ig_session_id';
const FIRST_TOUCH_KEY = 'ig_first_touch';

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
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
    utm_term: params.get('utm_term') || null,
    gclid: params.get('gclid') || null,
  };
}

/**
 * Capture first-touch attribution once per browser (never overwritten).
 */
export function captureFirstTouch() {
  try {
    if (localStorage.getItem(FIRST_TOUCH_KEY)) return;
    const utm = readUtmParams();
    const payload = {
      landing_path: window.location.pathname,
      referrer: document.referrer || null,
      ...utm,
      captured_at: new Date().toISOString(),
    };
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(payload));
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
  const firstTouch = getFirstTouch();
  const session_id = getOrCreateSessionId();
  if (!firstTouch) {
    return {
      session_id,
      attribution: {
        landing_path: window.location.pathname,
        referrer: document.referrer || null,
        ...readUtmParams(),
      },
    };
  }
  return {
    session_id,
    attribution: {
      landing_path: firstTouch.landing_path,
      referrer: firstTouch.referrer,
      utm_source: firstTouch.utm_source,
      utm_medium: firstTouch.utm_medium,
      utm_campaign: firstTouch.utm_campaign,
      utm_content: firstTouch.utm_content,
      utm_term: firstTouch.utm_term,
      gclid: firstTouch.gclid,
    },
  };
}
