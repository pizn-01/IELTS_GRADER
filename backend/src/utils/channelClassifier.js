const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'display']);

const REFERRER_CHANNELS = [
  { channel: 'facebook', patterns: ['facebook.com', 'fb.com', 'm.facebook.com'] },
  { channel: 'instagram', patterns: ['instagram.com'] },
  { channel: 'reddit', patterns: ['reddit.com', 'old.reddit.com'] },
  { channel: 'quora', patterns: ['quora.com'] },
  { channel: 'twitter', patterns: ['twitter.com', 't.co', 'x.com'] },
  { channel: 'linkedin', patterns: ['linkedin.com'] },
  { channel: 'tiktok', patterns: ['tiktok.com'] },
  { channel: 'youtube', patterns: ['youtube.com', 'youtu.be'] },
];

function normalizeHost(referrer) {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function hasUtm(utm) {
  return Boolean(
    utm?.utm_source || utm?.utm_medium || utm?.utm_campaign ||
    utm?.utm_content || utm?.utm_term
  );
}

/**
 * Classify traffic channel from referrer, UTM params, and gclid.
 */
function classifyChannel({ referrer, utm_source, utm_medium, gclid } = {}) {
  const medium = (utm_medium || '').toLowerCase();
  const source = (utm_source || '').toLowerCase();

  if (gclid || PAID_MEDIUMS.has(medium)) {
    return 'google_ads';
  }

  if (medium === 'email') {
    return 'email';
  }

  if (source) {
    const sourceMap = {
      google: medium === 'organic' ? 'google_organic' : 'google',
      facebook: 'facebook',
      fb: 'facebook',
      instagram: 'instagram',
      ig: 'instagram',
      reddit: 'reddit',
      quora: 'quora',
      twitter: 'twitter',
      x: 'twitter',
      linkedin: 'linkedin',
      tiktok: 'tiktok',
      youtube: 'youtube',
    };
    if (sourceMap[source]) return sourceMap[source];
    if (medium === 'social') return source;
    if (medium === 'cpc' || medium === 'ppc' || medium === 'paid') return 'google_ads';
  }

  const host = normalizeHost(referrer);
  if (host) {
    if (host.includes('google.')) return 'google_organic';
    for (const { channel, patterns } of REFERRER_CHANNELS) {
      if (patterns.some(p => host === p || host.endsWith('.' + p))) {
        return channel;
      }
    }
    return 'referral';
  }

  if (!hasUtm({ utm_source, utm_medium })) {
    return 'direct';
  }

  return 'referral';
}

module.exports = { classifyChannel };
