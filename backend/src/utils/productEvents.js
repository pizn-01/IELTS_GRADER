const { supabaseAdmin } = require('../services/supabase');

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

const FUNNEL_EVENT_SET = new Set(FUNNEL_EVENTS);

/**
 * Fire-and-forget insert into product_events.
 * Never throws — callers should not await for control flow.
 */
async function trackProductEvent({ eventName, userId = null, sessionId = null, properties = {} } = {}) {
  if (!eventName || !FUNNEL_EVENT_SET.has(eventName)) {
    console.warn(`[productEvents] Ignoring unknown event: ${eventName}`);
    return false;
  }

  try {
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
  FUNNEL_EVENT_SET,
  trackProductEvent,
};
