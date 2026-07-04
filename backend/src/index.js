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

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust the first proxy hop (Vercel / Fly.io edge) ──────────────────────────
// Without this, req.ip is the shared proxy IP and ALL users hit the same
// rate-limit bucket, causing 429s after just a few requests across the whole app.
app.set('trust proxy', 1);

// Allow all origins — security is enforced via JWT on protected routes
app.use(cors());

// ── Stripe webhook needs the raw request body for signature verification ───
// We capture it in the verify hook so the normal JSON middleware still works
// for all other routes.
app.use(express.json({
  limit: '10mb',
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
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Auth WRITE (POST /login, /register) — brute-force protection, strict
const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

// Auth READ (GET /me) — very permissive, just prevents scraping
const authReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Submission WRITE (POST) — each costs a credit, keep strict
const submissionsWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Submission rate limit exceeded. Please wait before submitting again.' },
});

// Submission READ (GET list + status polling) — must be very permissive:
// status polling fires every 3s for up to 2 minutes per grading session.
const submissionsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a moment.' },
});

app.use(globalLimiter);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Auth routes — differentiated write vs read limits ─────────────────────────
app.use('/api/auth/login', authWriteLimiter);
app.use('/api/auth/register', authWriteLimiter);
app.use('/api/auth', (req, res, next) => {
  if (req.path === '/login' || req.path === '/register') {
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
app.use('/api/discounts', discountsRoutes);
app.use('/api/stripe', stripeRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Fly.io requires listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`IELTS Grader Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
