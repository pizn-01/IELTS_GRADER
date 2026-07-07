const { classifyChannel } = require('./channelClassifier');
const { lookupGeo } = require('./geoip');
const { getClientIp } = require('./getClientIp');

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

function resolveLandingPath(attribution = {}) {
  const signupPath = attribution.signup_path || attribution.path || null;
  const candidate = attribution.landing_path || signupPath || '/';
  if (isInternalPath(candidate)) {
    return isInternalPath(signupPath) ? '/' : signupPath;
  }
  return candidate || '/';
}

/**
 * Normalize attribution payload from client for DB storage.
 */
function normalizeAttribution(input = {}) {
  const referrer = input.referrer || null;
  const utm_source = input.utm_source || null;
  const utm_medium = input.utm_medium || null;
  const utm_campaign = input.utm_campaign || null;
  const utm_content = input.utm_content || null;
  const utm_term = input.utm_term || null;
  const gclid = input.gclid || null;
  const landing_path = resolveLandingPath(input);

  const channel = classifyChannel({ referrer, utm_source, utm_medium, gclid });

  return {
    landing_path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    gclid,
    channel,
  };
}

/**
 * Persist first-touch attribution on profiles and link visitor session.
 */
async function saveUserAttribution(supabaseAdmin, userId, { attribution, session_id, req } = {}) {
  if (!attribution && !session_id) return;

  const signupGeo = req ? lookupGeo(getClientIp(req)) : null;
  const normalized = attribution ? normalizeAttribution(attribution) : null;
  const profileUpdate = {};

  if (normalized) {
    Object.assign(profileUpdate, {
      acquisition_channel: normalized.channel,
      landing_path: normalized.landing_path,
      referrer: normalized.referrer,
      utm_source: normalized.utm_source,
      utm_medium: normalized.utm_medium,
      utm_campaign: normalized.utm_campaign,
      gclid: normalized.gclid,
    });
  }

  if (signupGeo?.country) {
    profileUpdate.acquisition_country = signupGeo.country;
    profileUpdate.acquisition_city = signupGeo.city || null;
  }

  if (session_id) {
    profileUpdate.visitor_session_id = session_id;

    const { data: session } = await supabaseAdmin
      .from('visitor_sessions')
      .select('country, city, channel, landing_path')
      .eq('session_id', session_id)
      .maybeSingle();

    if (session) {
      if (!profileUpdate.acquisition_country && session.country) {
        profileUpdate.acquisition_country = session.country;
      }
      if (!profileUpdate.acquisition_city && session.city) {
        profileUpdate.acquisition_city = session.city;
      }
      if (!profileUpdate.acquisition_channel && session.channel) {
        profileUpdate.acquisition_channel = session.channel;
      }
      if (!profileUpdate.landing_path && session.landing_path && !isInternalPath(session.landing_path)) {
        profileUpdate.landing_path = session.landing_path;
      }
    }

    const sessionUpdate = { converted_user_id: userId };
    if (signupGeo?.country) {
      sessionUpdate.country = signupGeo.country;
      sessionUpdate.city = signupGeo.city || null;
      sessionUpdate.region = signupGeo.region || null;
    }
    if (normalized?.landing_path && !isInternalPath(normalized.landing_path)) {
      sessionUpdate.landing_path = normalized.landing_path;
      sessionUpdate.channel = normalized.channel;
    }

    await supabaseAdmin
      .from('visitor_sessions')
      .update(sessionUpdate)
      .eq('session_id', session_id);
  }

  if (Object.keys(profileUpdate).length > 0) {
    await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);
  }
}

module.exports = {
  normalizeAttribution,
  saveUserAttribution,
  isInternalPath,
  resolveLandingPath,
};
