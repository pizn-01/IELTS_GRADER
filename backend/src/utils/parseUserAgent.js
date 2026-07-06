function parseUserAgent(ua) {
  if (!ua) {
    return { device_type: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  const lower = ua.toLowerCase();
  let device_type = 'desktop';
  if (/mobile|android|iphone|ipod|windows phone/i.test(ua)) {
    device_type = 'mobile';
  } else if (/ipad|tablet/i.test(ua)) {
    device_type = 'tablet';
  }

  let browser = 'unknown';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('chromium')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/') && !lower.includes('chrome')) browser = 'Safari';
  else if (lower.includes('opr/') || lower.includes('opera')) browser = 'Opera';

  let os = 'unknown';
  if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('android')) os = 'Android';
  else if (/iphone|ipad|ipod/.test(lower)) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';

  return { device_type, browser, os };
}

module.exports = { parseUserAgent };
