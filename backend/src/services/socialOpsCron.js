/**
 * In-process Social Ops scheduler (America/New_York).
 * Monday 00:00 weekly merge; Tue–Fri 08:00 daily brief; Sunday 18:00 scorecard.
 * Respects job lock via socialOps.startRun.
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '..', '..', '.social_ops_cron_state.json');

function etParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour === '24' ? '0' : parts.hour);
  return {
    weekday: parts.weekday, // Mon, Tue, ...
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
  };
}

function readState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('[social-ops-cron] state write failed', err.message);
  }
}

function startSocialOpsCron(socialOps) {
  if (process.env.SOCIAL_OPS_CRON_DISABLE === '1') {
    console.log('[social-ops-cron] disabled via SOCIAL_OPS_CRON_DISABLE');
    return () => {};
  }

  const tick = () => {
    const et = etParts();
    const state = readState();
    const jobs = [];

    // Monday 00:00–00:14 ET → weekly
    if (et.weekday === 'Mon' && et.hour === 0 && et.minute < 15) {
      const key = `weekly:${et.dateKey}`;
      if (state[key] !== 'ok' && state[key] !== 'started') {
        jobs.push({ key, action: 'weekly' });
      }
    }

    // Tue–Fri 08:00–08:14 ET → daily
    if (
      ['Tue', 'Wed', 'Thu', 'Fri'].includes(et.weekday) &&
      et.hour === 8 &&
      et.minute < 15
    ) {
      const key = `daily:${et.dateKey}`;
      if (state[key] !== 'ok' && state[key] !== 'started') {
        jobs.push({ key, action: 'daily' });
      }
    }

    // Sunday 18:00–18:14 ET → sunday wrap
    if (et.weekday === 'Sun' && et.hour === 18 && et.minute < 15) {
      const key = `sunday:${et.dateKey}`;
      if (state[key] !== 'ok' && state[key] !== 'started') {
        jobs.push({ key, action: 'sunday' });
      }
    }

    for (const job of jobs) {
      try {
        state[job.key] = 'started';
        writeState(state);
        socialOps.startRun(job.action, {});
        console.log(`[social-ops-cron] started ${job.action} (${job.key})`);
        state[job.key] = 'ok';
        writeState(state);
      } catch (err) {
        if (err.code === 'JOB_BUSY') {
          console.log(`[social-ops-cron] skip ${job.action}: job busy`);
          delete state[job.key];
          writeState(state);
        } else {
          console.error(`[social-ops-cron] ${job.action} failed`, err.message);
          state[job.key] = `error:${err.message}`;
          writeState(state);
        }
      }
    }
  };

  tick();
  const id = setInterval(tick, 60 * 1000);
  console.log('[social-ops-cron] armed (America/New_York: Mon 00:00 weekly, Tue–Fri 08:00 daily, Sun 18:00 wrap)');
  return () => clearInterval(id);
}

module.exports = { startSocialOpsCron, etParts };
