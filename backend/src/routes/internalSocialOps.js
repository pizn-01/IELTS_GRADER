/**
 * Internal Social Ops cron trigger — protected by SOCIAL_OPS_CRON_SECRET.
 * POST /api/internal/social-ops/cron  body: { job: "weekly"|"daily"|"sunday"|"onboarding_prepare" }
 */
const express = require('express');
const socialOps = require('../services/socialOps');

const router = express.Router();

function authorize(req, res, next) {
  const expected = (process.env.SOCIAL_OPS_CRON_SECRET || '').trim();
  if (!expected) {
    return res.status(503).json({ error: 'SOCIAL_OPS_CRON_SECRET not configured' });
  }
  const got =
    (req.get('X-Social-Ops-Cron-Secret') || '').trim() ||
    (req.body && req.body.secret) ||
    '';
  if (got !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

router.post('/cron', authorize, (req, res) => {
  try {
    const jobName = String(req.body?.job || 'weekly');
    const allowed = new Set(['weekly', 'daily', 'sunday', 'onboarding_prepare', 'cold_start']);
    if (!allowed.has(jobName)) {
      return res.status(400).json({ error: `Unknown job: ${jobName}` });
    }
    const job = socialOps.startRun(jobName, {
      dry_run: Boolean(req.body?.dry_run),
      no_fresh: Boolean(req.body?.no_fresh),
      reset: req.body?.reset !== false,
    });
    return res.json({ ok: true, job });
  } catch (err) {
    const status = err.code === 'JOB_BUSY' ? 409 : 400;
    return res.status(status).json({ error: err.message });
  }
});

router.get('/health', (_req, res) => {
  const job = socialOps.readJob();
  return res.json({
    ok: true,
    cron_secret_configured: Boolean((process.env.SOCIAL_OPS_CRON_SECRET || '').trim()),
    job: { status: job.status, action: job.action },
  });
});

module.exports = router;
