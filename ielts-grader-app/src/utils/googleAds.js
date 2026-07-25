/** Google Ads conversion IDs (base tag is in index.html). */
export const GOOGLE_ADS_SIGNUP_SEND_TO = 'AW-18322992043/jhkbCJ-rl9YcEKvXiqFE';

const SIGNUP_DEDUP_PREFIX = 'gads_signup_conv:';

/**
 * Fire the Sign-up conversion after a successful account creation.
 * Dedupes per user for the browser session (OAuth remounts / Strict Mode).
 */
export function trackSignUpConversion({ userId } = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  if (userId) {
    try {
      const key = `${SIGNUP_DEDUP_PREFIX}${userId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore storage failures
    }
  }

  window.gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_SIGNUP_SEND_TO,
  });
}
