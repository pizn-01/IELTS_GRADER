function cleanIp(ip) {
  return (ip || '').trim().replace(/^::ffff:/, '');
}

function isPrivateOrLoopback(ip) {
  const clean = cleanIp(ip);
  if (!clean) return true;
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  if (clean.startsWith('10.')) return true;
  if (clean.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) return true;
  if (clean.startsWith('fc') || clean.startsWith('fd')) return true;
  return false;
}

/**
 * Resolve the end-user IP behind Vercel / Fly / other proxies.
 * Prefer forwarded headers over the immediate TCP peer (often a US edge node).
 */
function getClientIp(req) {
  const singleHeaders = [
    'x-vercel-forwarded-for',
    'cf-connecting-ip',
    'x-real-ip',
  ];

  for (const key of singleHeaders) {
    const value = req.headers[key];
    if (!value) continue;
    const ip = cleanIp(String(value).split(',')[0]);
    if (!isPrivateOrLoopback(ip)) return ip;
  }

  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    for (const part of String(xff).split(',')) {
      const ip = cleanIp(part);
      if (!isPrivateOrLoopback(ip)) return ip;
    }
  }

  // Direct browser → Fly (no Vercel in between)
  const flyIp = cleanIp(req.headers['fly-client-ip']);
  if (!isPrivateOrLoopback(flyIp)) return flyIp;

  const reqIp = cleanIp(req.ip);
  if (!isPrivateOrLoopback(reqIp)) return reqIp;

  return null;
}

module.exports = { getClientIp };
