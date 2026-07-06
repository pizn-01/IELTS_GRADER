const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { normalizeAttribution } = require('../utils/attribution');
const { lookupGeo } = require('../utils/geoip');
const { getClientIp } = require('../utils/getClientIp');
const { parseUserAgent } = require('../utils/parseUserAgent');

const router = express.Router();

// ─── POST /api/tracking/pageview ─────────────────────────────────────────────
router.post('/pageview', async (req, res) => {
  const {
    session_id,
    path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    gclid,
  } = req.body || {};

  if (!session_id || !path) {
    return res.status(400).json({ error: 'session_id and path are required.' });
  }

  const now = new Date().toISOString();
  const geo = lookupGeo(getClientIp(req));
  const device = parseUserAgent(req.headers['user-agent']);
  const attribution = normalizeAttribution({
    path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    gclid,
  });

  try {
    const { data: existing } = await supabaseAdmin
      .from('visitor_sessions')
      .select('id, page_view_count, first_seen_at')
      .eq('session_id', session_id)
      .maybeSingle();

    if (!existing) {
        const { error: insertErr } = await supabaseAdmin.from('visitor_sessions').insert({
          session_id,
          landing_path: attribution.landing_path,
          referrer: attribution.referrer,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          utm_term: attribution.utm_term,
          gclid: attribution.gclid,
          channel: attribution.channel,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          device_type: device.device_type,
          browser: device.browser,
          os: device.os,
          page_view_count: 1,
          duration_seconds: 0,
          is_bounce: true,
          first_seen_at: now,
          last_seen_at: now,
        });
        if (insertErr) throw insertErr;
    } else {
      const firstSeen = new Date(existing.first_seen_at).getTime();
      const durationSeconds = Math.max(0, Math.floor((Date.now() - firstSeen) / 1000));
      const newCount = (existing.page_view_count || 0) + 1;

      const { error: updateErr } = await supabaseAdmin
        .from('visitor_sessions')
        .update({
          page_view_count: newCount,
          duration_seconds: durationSeconds,
          last_seen_at: now,
          is_bounce: newCount <= 1 && durationSeconds < 10,
        })
        .eq('session_id', session_id);

      if (updateErr) throw updateErr;
    }

    const { error: pvErr } = await supabaseAdmin.from('page_views').insert({
      session_id,
      path,
      created_at: now,
    });
    if (pvErr) throw pvErr;

    return res.json({ ok: true });
  } catch (err) {
    console.error('[tracking/pageview]', err.message);
    return res.status(500).json({ error: 'Failed to record page view.' });
  }
});

module.exports = router;
