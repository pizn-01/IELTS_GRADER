require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

const app = express();
const PORT = process.env.PORT || 5000;

// Allow all origins — security is enforced via JWT on protected routes
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', bootstrapRouter); // bootstrap has its own auth (GRADING_SECRET)
app.use('/api/discounts', discountsRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Fly.io requires listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`IELTS Grader Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
