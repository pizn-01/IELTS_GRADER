require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const submissionsRoutes = require('./routes/submissions');
const reportsRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const tasksRoutes = require('./routes/tasks');
const supportRoutes = require('./routes/support');
const storageRoutes = require('./routes/storage');
const adminRoutes = require('./routes/admin');
const { bootstrapRouter } = require('./routes/admin');
const discountsRoutes = require('./routes/discounts');
const stripeRoutes = require('./routes/stripe');
const learningRoutes = require('./routes/learning');
const trackingRoutes = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 5000;

// Fly/Vercel forward the real client IP — use it so one user isn't bucketed with everyone.
function clientIpKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : null;
  return req.headers['fly-client-ip'] || forwardedIp || req.ip || 'unknown';
}

// ── Trust proxy hops (Fly.io / Vercel edge) ───────────────────────────────────
app.set('trust proxy', true);

// Allow all origins — security is enforced via JWT on protected routes
app.use(cors());

// ── Stripe webhook needs the raw request body for signature verification ───
// We capture it in the verify hook so the normal JSON middleware still works
// for all other routes.
app.use(express.json({
  // Upload flow may attach a chart image as base64 (~10–12MB).
  limit: '20mb',
  verify: (req, _res, buf) => {
    if (req.originalUrl.includes('/stripe/webhook')) {
      req.rawBody = buf;
    }
  },
}));

// Disable caching for all API responses to prevent user data caching issues
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ── Rate limiters ──────────────────────────────────────────────────────────────

// Global catch-all — generous, real enforcement is per-route below
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many requests. Please try again later.' },
});

// Auth WRITE (POST /login, /register, /google) — brute-force protection
const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

// Auth READ (GET /me) — very permissive, just prevents scraping
const authReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many requests. Please slow down.' },
});

// Submission WRITE (POST) — each costs a credit, keep strict
const submissionsWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Submission rate limit exceeded. Please wait before submitting again.' },
});

// Submission READ (GET list + status polling) — must be very permissive:
// status polling fires every 3s for up to ~15 minutes while grading retries.
const submissionsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many requests. Please try again in a moment.' },
});

// Visitor tracking — generous for SPA route changes
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many tracking requests. Please slow down.' },
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Temporary debug ingest for agent sessions (no secrets; capped payload)
app.post('/api/debug/agent-log', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entry = {
      sessionId: body.sessionId || '5c9f04',
      runId: body.runId || null,
      hypothesisId: body.hypothesisId || null,
      location: body.location || null,
      message: body.message || null,
      data: body.data || null,
      timestamp: body.timestamp || Date.now(),
    };
    console.log('[debug-agent]', JSON.stringify(entry));
    const logPath = path.join(__dirname, '../../.cursor/debug-5c9f04.log');
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (writeErr) {
      console.error('[debug-agent] file write failed', writeErr.message);
    }
  } catch (err) {
    console.error('[debug-agent] log failed', err.message);
  }
  return res.json({ ok: true });
});

app.use(globalLimiter);

// ── Auth routes — differentiated write vs read limits ─────────────────────────
app.use('/api/auth/login', authWriteLimiter);
app.use('/api/auth/register', authWriteLimiter);
app.use('/api/auth/google', authWriteLimiter);
app.use('/api/auth', (req, res, next) => {
  if (req.path === '/login' || req.path === '/register' || req.path === '/google') {
    return next();
  }
  authReadLimiter(req, res, next);
});
app.use('/api/auth', authRoutes);

// ── Submissions — strict write, very permissive read ──────────────────────────
app.post('/api/submissions', submissionsWriteLimiter);
app.use('/api/submissions', (req, res, next) => {
  if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
    return next();
  }
  submissionsReadLimiter(req, res, next);
});
app.use('/api/submissions', submissionsRoutes);

app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api', require('./routes/extract'));
app.use('/api/support', supportRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/admin', bootstrapRouter); // bootstrap has its own auth (GRADING_SECRET) — must be BEFORE adminRoutes
app.use('/api/admin', adminRoutes);
app.use('/api/internal/social-ops', require('./routes/internalSocialOps'));
app.use('/api/discounts', discountsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/learning', learningRoutes);
app.use('/api/tracking', trackingLimiter, trackingRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Fly.io requires listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`IELTS Grader Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
  try {
    const socialOps = require('./services/socialOps');
    const { startSocialOpsCron } = require('./services/socialOpsCron');
    startSocialOpsCron(socialOps);
  } catch (err) {
    console.warn('[social-ops-cron] not started:', err.message);
  }
  try {
    const { startGradingReconcile } = require('./services/gradingReconcile');
    startGradingReconcile();
  } catch (err) {
    console.warn('[grading-reconcile] not started:', err.message);
  }
  try {
    const { validateStripePriceCatalog } = require('./routes/stripe');
    validateStripePriceCatalog().catch((err) => {
      console.warn('[stripe] price catalog validation error:', err.message);
    });
  } catch (err) {
    console.warn('[stripe] price catalog validation not started:', err.message);
  }
});
