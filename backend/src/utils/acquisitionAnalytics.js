const REPORT_TIMEZONE = 'America/Toronto';

const CHART_LEVELS = {
  daily: { granularity: 'day', days: 30, label: 'Last 30 days' },
  weekly: { granularity: 'week', weeks: 12, label: 'Last 12 weeks' },
  monthly: { granularity: 'month', months: 12, label: 'Last 12 months' },
  yearly: { granularity: 'year', years: 5, label: 'Last 5 years' },
};

function parseChartLevel(level) {
  return CHART_LEVELS[level] ? level : 'daily';
}

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

function sinceIsoForLevel(level) {
  const cfg = CHART_LEVELS[parseChartLevel(level)];
  if (cfg.days) return sinceIso(cfg.days);
  if (cfg.weeks) return sinceIso(cfg.weeks * 7);
  if (cfg.months) return sinceIso(cfg.months * 31);
  if (cfg.years) return sinceIso(cfg.years * 366);
  return sinceIso(30);
}

function torontoDateParts(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
  };
}

function torontoDateKey(iso) {
  const { year, month, day } = torontoDateParts(iso);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function torontoMonthKey(iso) {
  const { year, month } = torontoDateParts(iso);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function torontoYearKey(iso) {
  return String(torontoDateParts(iso).year);
}

function torontoDayOfWeek(iso) {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIMEZONE,
    weekday: 'short',
  }).format(new Date(iso));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? 0;
}

function addDaysToDateKey(dateKey, delta) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function torontoWeekStartKey(iso) {
  const dateKey = torontoDateKey(iso);
  const daysFromMonday = (torontoDayOfWeek(iso) + 6) % 7;
  return addDaysToDateKey(dateKey, -daysFromMonday);
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
  if (granularity === 'week') return torontoWeekStartKey(iso);
  if (granularity === 'month') return torontoMonthKey(iso);
  if (granularity === 'year') return torontoYearKey(iso);
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

  return {
    total_sessions: totalSessions,
    anonymous_sessions: anonymousSessions,
    converted_sessions: convertedSessions,
    unique_visitors: totalSessions,
    total_pageviews: totalPageviews,
    bounce_rate: totalSessions ? Math.round((bounced / totalSessions) * 100) : 0,
    avg_pages_per_session: totalSessions ? Math.round((totalPages / totalSessions) * 10) / 10 : 0,
    avg_duration_seconds: totalSessions ? Math.round(totalDuration / totalSessions) : 0,
    signup_count: signups.length,
    conversion_rate: totalSessions ? Math.round((convertedSessions / totalSessions) * 1000) / 10 : 0,
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

function eachTorontoWeekKeys(weekCount) {
  const currentStart = torontoWeekStartKey(new Date().toISOString());
  const keys = [];
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    keys.push(addDaysToDateKey(currentStart, -i * 7));
  }
  return keys;
}

function eachTorontoMonthKeys(monthCount) {
  const now = torontoDateParts(new Date().toISOString());
  const keys = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    let month = now.month - i;
    let year = now.year;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return keys;
}

function eachTorontoYearKeys(yearCount) {
  const currentYear = torontoDateParts(new Date().toISOString()).year;
  const keys = [];
  for (let i = yearCount - 1; i >= 0; i -= 1) {
    keys.push(String(currentYear - i));
  }
  return keys;
}

function getTimeseriesKeys(level) {
  const cfg = CHART_LEVELS[parseChartLevel(level)];
  switch (cfg.granularity) {
    case 'week':
      return eachTorontoWeekKeys(cfg.weeks);
    case 'month':
      return eachTorontoMonthKeys(cfg.months);
    case 'year':
      return eachTorontoYearKeys(cfg.years);
    default:
      return eachTorontoDayKeys(cfg.days);
  }
}

function computeTimeseries(sessions, signups, level = 'daily') {
  const cfg = CHART_LEVELS[parseChartLevel(level)];
  const granularity = cfg.granularity;
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

  const keys = getTimeseriesKeys(level);

  return keys.map((date) => ({
    date,
    sessions: sessionMap[date] || 0,
    signups: signupMap[date] || 0,
  }));
}

function getChartLevelMeta(level) {
  const key = parseChartLevel(level);
  return { level: key, ...CHART_LEVELS[key] };
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
  CHART_LEVELS,
  parseDays,
  parseChartLevel,
  sinceIso,
  sinceIsoForLevel,
  computeOverview,
  computeTimeseries,
  getChartLevelMeta,
  computeByChannel,
  computeByCountry,
  computeByLanding,
  computeByHour,
};
