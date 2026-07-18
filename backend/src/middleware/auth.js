const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, email }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

/** Attach req.user when a valid JWT is present; otherwise continue as guest. */
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'] || req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    // Ignore invalid/expired token — treat as guest
  }
  next();
};

module.exports = { authenticateToken, optionalAuth };
