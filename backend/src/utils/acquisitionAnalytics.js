const REPORT_TIMEZONE = 'America/Toronto';

function parseDays(days, defaultDays = 30) {
  const n = parseInt(days, 10);
  if (!Number.isFinite(n) || n < 1) return defaultDays;
  return Math.min(n, 365);
}

function sinceIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function torontoDateKey(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function torontoHour(iso) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(new Date(iso));

  const parsed = parseInt(hour, 10);
  return Number.isFinite(parsed) ? parsed % 24 : 0;
}

function bucketDate(iso, granularity = 'day') {
  if (granularity === 'hour') {
    const date = torontoDateKey(iso);
    const hour = String(torontoHour(iso)).padStart(2, '0');
    return `${date}T${hour}:00`;
  }
  return torontoDateKey(iso);
}

function aggregateByKey(rows, keyFn, valueFn = () => 1) {
  const map = {};
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    map[key] = (map[key] || 0) + valueFn(row);
  }
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function computeOverview(sessions, pageViews, signups) {
  const totalSessions = sessions.length;
  const anonymousSessions = sessions.filter((s) => !s.converted_user_id).length;
  const convertedSessions = sessions.filter((s) => s.converted_user_id).length;
  const totalPageviews = pageViews.length;
  const bounced = sessions.filter((s) => s.is_bounce).length;
  const totalPages = sessions.reduce((sum, s) => sum + (s.page_view_count || 0), 0);
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

  const channelCounts = aggregateByKey(sessions, (s) => s.channel);
  const topChannel = channelCounts[0]?.key || '—';
  const signupCount = signups.length;

  return {
    total_sessions: totalSessions,
    anonymous_sessions: anonymousSessions,
    converted_sessions: convertedSessions,
    unique_visitors: totalSessions,
    total_pageviews: totalPageviews,
    bounce_rate: totalSessions ? Math.round((bounced / totalSessions) * 100) : 0,
    avg_pages_per_session: totalSessions ? Math.round((totalPages / totalSessions) * 10) / 10 : 0,
    avg_duration_seconds: totalSessions ? Math.round(totalDuration / totalSessions) : 0,
    signup_count: signupCount,
    // Sessions that linked to a signup (converted_user_id set) / total sessions in period
    session_conversion_rate: totalSessions ? Math.round((convertedSessions / totalSessions) * 1000) / 10 : 0,
    // Legacy alias
    conversion_rate: totalSessions ? Math.round((convertedSessions / totalSessions) * 1000) / 10 : 0,
    // New accounts / sessions in period (can exceed 100% when signups lack a tracked session)
    signup_per_session: totalSessions ? Math.round((signupCount / totalSessions) * 1000) / 10 : 0,
    top_channel: topChannel,
    timezone: REPORT_TIMEZONE,
  };
}

function eachTorontoDayKeys(days) {
  const keys = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(torontoDateKey(d.toISOString()));
  }
  return keys;
}

function computeTimeseries(sessions, signups, granularity = 'day', days = 30) {
  const sessionMap = {};
  const signupMap = {};

  for (const s of sessions) {
    const bucket = bucketDate(s.first_seen_at, granularity);
    sessionMap[bucket] = (sessionMap[bucket] || 0) + 1;
  }

  for (const u of signups) {
    const bucket = bucketDate(u.created_at, granularity);
    signupMap[bucket] = (signupMap[bucket] || 0) + 1;
  }

  const keys = granularity === 'day'
    ? eachTorontoDayKeys(parseDays(days))
    : [...new Set([...Object.keys(sessionMap), ...Object.keys(signupMap)])].sort();

  return keys.map((date) => ({
    date,
    sessions: sessionMap[date] || 0,
    signups: signupMap[date] || 0,
  }));
}

function computeByChannel(sessions) {
  const channelMap = {};
  for (const s of sessions) {
    const ch = s.channel || 'direct';
    if (!channelMap[ch]) channelMap[ch] = { channel: ch, sessions: 0, conversions: 0 };
    channelMap[ch].sessions += 1;
    if (s.converted_user_id) channelMap[ch].conversions += 1;
  }
  return Object.values(channelMap)
    .map((row) => ({
      ...row,
      conversion_rate: row.sessions ? Math.round((row.conversions / row.sessions) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function computeByCountry(sessions) {
  return aggregateByKey(sessions, (s) => s.country || 'Unknown')
    .map(({ key, count }) => ({ country: key, sessions: count }));
}

function computeByLanding(sessions) {
  return aggregateByKey(sessions, (s) => s.landing_path || '/')
    .map(({ key, count }) => ({ path: key, sessions: count }));
}

function computeByCampaign(sessions) {
  const campaignMap = {};
  for (const s of sessions) {
    const campaign = s.utm_campaign || (s.gclid ? '(google ads — no campaign tag)' : null);
    if (!campaign) continue;
    if (!campaignMap[campaign]) {
      campaignMap[campaign] = { campaign, sessions: 0, conversions: 0 };
    }
    campaignMap[campaign].sessions += 1;
    if (s.converted_user_id) campaignMap[campaign].conversions += 1;
  }
  return Object.values(campaignMap)
    .map((row) => ({
      ...row,
      conversion_rate: row.sessions ? Math.round((row.conversions / row.sessions) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function computeByHour(sessions) {
  const hourMap = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: formatHourLabel(i),
    sessions: 0,
  }));

  for (const s of sessions) {
    const hour = torontoHour(s.first_seen_at);
    hourMap[hour].sessions += 1;
  }

  return hourMap;
}

function formatHourLabel(hour) {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

module.exports = {
  REPORT_TIMEZONE,
  parseDays,
  sinceIso,
  computeOverview,
  computeTimeseries,
  computeByChannel,
  computeByCountry,
  computeByLanding,
  computeByCampaign,
  computeByHour,
};
