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

function bucketDate(iso, granularity = 'day') {
  const d = new Date(iso);
  if (granularity === 'hour') {
    return d.toISOString().slice(0, 13) + ':00:00.000Z';
  }
  return d.toISOString().slice(0, 10);
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
  const totalPageviews = pageViews.length;
  const bounced = sessions.filter(s => s.is_bounce).length;
  const totalPages = sessions.reduce((sum, s) => sum + (s.page_view_count || 0), 0);
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const conversions = sessions.filter(s => s.converted_user_id).length;

  const channelCounts = aggregateByKey(sessions, s => s.channel);
  const topChannel = channelCounts[0]?.key || '—';

  return {
    total_sessions: totalSessions,
    unique_visitors: totalSessions,
    total_pageviews: totalPageviews,
    bounce_rate: totalSessions ? Math.round((bounced / totalSessions) * 100) : 0,
    avg_pages_per_session: totalSessions ? Math.round((totalPages / totalSessions) * 10) / 10 : 0,
    avg_duration_seconds: totalSessions ? Math.round(totalDuration / totalSessions) : 0,
    signup_count: signups.length,
    conversion_rate: totalSessions ? Math.round((conversions / totalSessions) * 1000) / 10 : 0,
    top_channel: topChannel,
  };
}

function computeTimeseries(sessions, signups, granularity = 'day') {
  const visitMap = {};
  const signupMap = {};

  for (const s of sessions) {
    const bucket = bucketDate(s.first_seen_at, granularity);
    visitMap[bucket] = (visitMap[bucket] || 0) + 1;
  }

  for (const u of signups) {
    const bucket = bucketDate(u.created_at, granularity);
    signupMap[bucket] = (signupMap[bucket] || 0) + 1;
  }

  const keys = [...new Set([...Object.keys(visitMap), ...Object.keys(signupMap)])].sort();
  return keys.map(date => ({
    date,
    visits: visitMap[date] || 0,
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
    .map(row => ({
      ...row,
      conversion_rate: row.sessions ? Math.round((row.conversions / row.sessions) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function computeByCountry(sessions) {
  return aggregateByKey(sessions, s => s.country || 'Unknown')
    .map(({ key, count }) => ({ country: key, sessions: count }));
}

function computeByLanding(sessions) {
  return aggregateByKey(sessions, s => s.landing_path || '/')
    .map(({ key, count }) => ({ path: key, sessions: count }));
}

function computeByHour(sessions) {
  const hourMap = Array.from({ length: 24 }, (_, i) => ({ hour: i, sessions: 0 }));
  for (const s of sessions) {
    const hour = new Date(s.first_seen_at).getUTCHours();
    hourMap[hour].sessions += 1;
  }
  return hourMap;
}

module.exports = {
  parseDays,
  sinceIso,
  computeOverview,
  computeTimeseries,
  computeByChannel,
  computeByCountry,
  computeByLanding,
  computeByHour,
};
