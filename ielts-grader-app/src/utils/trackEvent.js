import { api } from '../services/api';

/**
 * Fire-and-forget product funnel event.
 * Shares session_id with visitor pageview tracking via api.trackEvent.
 */
export function trackEvent(eventName, properties = {}) {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return;
  if (!eventName) return;
  api.trackEvent(eventName, properties).catch(() => {});
}
