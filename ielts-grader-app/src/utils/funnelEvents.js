import { api } from '../services/api';
import { getAttributionPayload } from './attribution';

/** Fire funnel milestones via existing page_views (path convention). */
export function trackFunnelEvent(eventName, detail = '') {
  if (!eventName) return;
  const suffix = detail ? `/${encodeURIComponent(String(detail))}` : '';
  const path = `/event/${eventName}${suffix}`;
  try {
    const payload = getAttributionPayload(path);
    api.trackPageView(payload).catch(() => {});
  } catch {
    /* ignore */
  }
}
