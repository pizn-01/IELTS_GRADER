/**
 * Admin Social Ops routes — isolated under /api/admin/social-ops
 */
const express = require('express');
const socialOps = require('../services/socialOps');

const router = express.Router();

router.get('/status', async (_req, res) => {
  try {
    const data = await socialOps.getStatusBundle();
    return res.json(data);
  } catch (err) {
    console.error('[social-ops/status]', err.message);
    return res.status(500).json({ error: err.message || 'Status failed' });
  }
});

router.get('/job', (_req, res) => {
  return res.json(socialOps.readJob());
});

router.post('/run', (req, res) => {
  try {
    const action = req.body?.action;
    const job = socialOps.startRun(action, {
      dry_run: Boolean(req.body?.dry_run),
      no_fresh: Boolean(req.body?.no_fresh),
    });
    return res.json({ ok: true, job });
  } catch (err) {
    const status = err.code === 'JOB_BUSY' ? 409 : 400;
    return res.status(status).json({ error: err.message });
  }
});

router.get('/brief', (req, res) => {
  try {
    const kind = String(req.query.kind || 'today');
    return res.json(socialOps.getBrief(kind));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/actions', async (_req, res) => {
  try {
    const data = await socialOps.getStatusBundle();
    return res.json({ actions: data.actions || [], kpi: data.kpi });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/actions/:id', async (req, res) => {
  try {
    const onboarding = String(req.query.queue || '') === 'onboarding';
    const action = await socialOps.getAction(req.params.id, { onboarding });
    return res.json(action);
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
});

router.post('/actions/:id/done', async (req, res) => {
  try {
    const data = await socialOps.markDone(req.params.id, {
      awaiting_reply: Boolean(req.body?.awaiting_reply),
      skip: Boolean(req.body?.skip),
      got_reply: Boolean(req.body?.got_reply),
      still_waiting: Boolean(req.body?.still_waiting),
      dead: Boolean(req.body?.dead),
      onboarding: Boolean(req.body?.onboarding),
    });
    return res.json(data);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/copy-next', async (req, res) => {
  try {
    const data = await socialOps.copyNext({
      onboarding: Boolean(req.body?.onboarding),
    });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/schedule.csv', (_req, res) => {
  const csv = socialOps.getScheduleCsv();
  if (!csv) return res.status(404).json({ error: 'No schedule_export.csv yet. Run weekly pack first.' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="schedule_export.csv"');
  return res.send(csv);
});

router.get('/setup-check', async (_req, res) => {
  try {
    const data = await socialOps.setupCheck();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/bundle', async (_req, res) => {
  try {
    const status = await socialOps.getStatusBundle();
    let today = { exists: false, markdown: '' };
    try {
      today = socialOps.getBrief('today');
    } catch {
      /* empty */
    }
    return res.json({ ...status, today_brief: today });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
