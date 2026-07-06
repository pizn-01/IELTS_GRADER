const geoip = require('geoip-lite');

/**
 * Resolve country/region/city from IP. Does not persist the IP.
 */
function lookupGeo(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) {
    return { country: null, region: null, city: null };
  }

  const cleanIp = ip.replace(/^::ffff:/, '');
  const geo = geoip.lookup(cleanIp);
  if (!geo) {
    return { country: null, region: null, city: null };
  }

  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
  };
}

module.exports = { lookupGeo };
