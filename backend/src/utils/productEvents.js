const { supabaseAdmin } = require('../services/supabase');

/** Sequential signup → payment funnel (admin conversion chain). */
const FUNNEL_EVENTS = [
  'signup',
  'test_started',
  'test_completed',
  'grading_completed',
  'upgrade_cta_clicked',
  'pricing_viewed',
  'checkout_started',
  'payment_completed',
];

/**
 * Free-trial engagement depth (not part of the linear payment funnel —
 * users may upgrade after 1 credit without exhausting all 3).
 */
const FREE_TRIAL_ENGAGEMENT_EVENTS = [
  'free_credit_1_used',
  'free_credits_all_used',
];

const TRACKED_EVENTS = [...FUNNEL_EVENTS, ...FREE_TRIAL_ENGAGEMENT_EVENTS];
const FUNNEL_EVENT_SET = new Set(FUNNEL_EVENTS);
const TRACKED_EVENT_SET = new Set(TRACKED_EVENTS);

/**
 * Funnel metrics ignore events before this timestamp so counts restart cleanly
 * after switching to unique-user + admin-excluded logic.
 * Override with FUNNEL_METRICS_SINCE (ISO string) if needed.
 */
const FUNNEL_METRICS_SINCE =
  process.env.FUNNEL_METRICS_SINCE || '2026-07-28T13:30:00.000Z';

const adminIdCache = { ids: null, fetchedAt: 0 };
const ADMIN_CACHE_TTL_MS = 60_000;

async function fetchAdminUserIds() {
  const now = Date.now();
  if (adminIdCache.ids && now - adminIdCache.fetchedAt < ADMIN_CACHE_TTL_MS) {
    return adminIdCache.ids;
  }

  const ids = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row.id) ids.add(row.id);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  adminIdCache.ids = ids;
  adminIdCache.fetchedAt = now;
  return ids;
}

async function isAdminUserId(userId) {
  if (!userId) return false;
  const ids = await fetchAdminUserIds();
  return ids.has(userId);
}

/**
 * Fire-and-forget insert into product_events.
 * Never throws — callers should not await for control flow.
 * Skips admin users so they never enter the conversion funnel.
 */
async function trackProductEvent({ eventName, userId = null, sessionId = null, properties = {} } = {}) {
  if (!eventName || !TRACKED_EVENT_SET.has(eventName)) {
    console.warn(`[productEvents] Ignoring unknown event: ${eventName}`);
    return false;
  }

  try {
    if (userId && await isAdminUserId(userId)) {
      return false;
    }

    const row = {
      event_name: eventName,
      user_id: userId || null,
      session_id: sessionId || null,
      properties: properties && typeof properties === 'object' ? properties : {},
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('product_events').insert(row);
    if (error) {
      console.error(`[productEvents] Insert failed (${eventName}):`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[productEvents] Unexpected error (${eventName}):`, err.message);
    return false;
  }
}

module.exports = {
  FUNNEL_EVENTS,
  FREE_TRIAL_ENGAGEMENT_EVENTS,
  TRACKED_EVENTS,
  FUNNEL_EVENT_SET,
  TRACKED_EVENT_SET,
  FUNNEL_METRICS_SINCE,
  fetchAdminUserIds,
  isAdminUserId,
  trackProductEvent,
};
