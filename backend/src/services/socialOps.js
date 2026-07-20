/**
 * Social Ops Agent bridge — spawns SEO/social-media/scripts, reads THIS_WEEK.
 * Isolated: used only by /api/admin/social-ops.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function resolveSocialMediaRoot() {
  if (process.env.SOCIAL_OPS_ROOT) {
    return path.resolve(process.env.SOCIAL_OPS_ROOT);
  }
  const candidates = [
    // Local monorepo: backend/src/services → repo/SEO/social-media
    path.join(__dirname, '..', '..', '..', 'SEO', 'social-media'),
    // Fly/Docker: /app/social-media (copied next to /app/src)
    path.join(__dirname, '..', '..', 'social-media'),
  ];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, 'scripts', 'run_weekly_agent.py'))) {
      return root;
    }
  }
  return candidates[0];
}

const SOCIAL_ROOT = resolveSocialMediaRoot();
const SCRIPTS_DIR = path.join(SOCIAL_ROOT, 'scripts');
const OUTPUT_DIR = path.join(SOCIAL_ROOT, 'output');
const THIS_WEEK = path.join(OUTPUT_DIR, 'THIS_WEEK');
const COLD_START = path.join(OUTPUT_DIR, 'cold-start');
const JOB_PATH = path.join(THIS_WEEK, '_meta', 'job.json');

const RUN_MAP = {
  weekly: { script: 'run_weekly_agent.py', args: (b) => (b.dry_run ? ['--dry-run'] : []) },
  daily: {
    script: 'run_daily_brief.py',
    args: (b) => {
      const a = [];
      if (b.dry_run) a.push('--dry-run');
      if (b.no_fresh) a.push('--no-fresh');
      return a;
    },
  },
  sunday: { script: 'run_sunday_wrap.py', args: () => [] },
  cold_start: {
    script: 'run_cold_start_agent.py',
    args: (b) => (b.dry_run ? ['--dry-run'] : []),
  },
};

function resolvePython() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const socialVenv = path.join(SOCIAL_ROOT, '.venv', 'bin', 'python3');
  if (fs.existsSync(socialVenv)) return socialVenv;
  const socialVenvWin = path.join(SOCIAL_ROOT, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(socialVenvWin)) return socialVenvWin;
  const graderVenv = path.join(__dirname, '..', '..', 'python', '.venv', 'bin', 'python3');
  if (fs.existsSync(graderVenv)) return graderVenv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function loadScriptsEnv() {
  const envPath = path.join(SCRIPTS_DIR, '.env');
  const env = {
    ...process.env,
    SOCIAL_AGENT_NO_OPEN: '1',
    PYTHONUNBUFFERED: '1',
  };
  if (!fs.existsSync(envPath)) return env;
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && env[key] === undefined) env[key] = val;
    }
  } catch {
    /* ignore */
  }
  return env;
}

function ensureMetaDir() {
  fs.mkdirSync(path.join(THIS_WEEK, '_meta'), { recursive: true });
}

function readJob() {
  try {
    if (!fs.existsSync(JOB_PATH)) return { status: 'idle' };
    return JSON.parse(fs.readFileSync(JOB_PATH, 'utf8'));
  } catch {
    return { status: 'idle' };
  }
}

function writeJob(job) {
  ensureMetaDir();
  fs.writeFileSync(JOB_PATH, JSON.stringify(job, null, 2));
}

function extractJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in script output.');
  }
  return JSON.parse(output.slice(start, end + 1));
}

function runScript(scriptName, args = [], { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const python = resolvePython();
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script not found: ${scriptName}`));
      return;
    }
    const child = spawn(python, [scriptPath, ...args], {
      cwd: SCRIPTS_DIR,
      env: loadScriptsEnv(),
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Script timed out after ${timeoutMs}ms: ${scriptName}`));
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start ${scriptName}: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || stdout.trim() || `${scriptName} exited ${code}`
          )
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function getStatusBundle() {
  const { stdout } = await runScript('agent_status_json.py', [], {
    timeoutMs: 30000,
  });
  const data = extractJson(stdout);
  data.job = readJob();
  data.scripts_dir = SCRIPTS_DIR;
  return data;
}

function briefPath(kind) {
  const map = {
    today: path.join(THIS_WEEK, 'TODAY.md'),
    week: path.join(THIS_WEEK, 'WEEK_BRIEF.md'),
    open: path.join(THIS_WEEK, 'OPEN_ME.md'),
    scorecard: path.join(THIS_WEEK, '_meta', 'scorecard.md'),
    backlog: path.join(THIS_WEEK, 'SUNDAY_BACKLOG.md'),
    onboarding: path.join(COLD_START, 'ONBOARDING_BRIEF.md'),
  };
  return map[kind] || null;
}

function getBrief(kind) {
  const p = briefPath(kind);
  if (!p) throw new Error('Unknown brief kind');
  if (!fs.existsSync(p)) {
    return { kind, markdown: '', exists: false };
  }
  return {
    kind,
    markdown: fs.readFileSync(p, 'utf8'),
    exists: true,
    path: p,
  };
}

function extractPasteFromFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let openUrl = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('Open:')) {
      openUrl = line.slice(5).trim();
      break;
    }
  }
  let paste = '';
  let followup = '';
  if (text.includes('## PASTE')) {
    const after = text.split('## PASTE')[1];
    const parts = after.split(/\n## /);
    paste = (parts[0] || '').trim();
  }
  if (text.includes('## IF THEY REPLY')) {
    followup = text.split('## IF THEY REPLY')[1].trim();
    const first = followup.split('\n')[0] || '';
    if (/follow-up/i.test(first)) {
      followup = followup.split('\n').slice(1).join('\n').trim();
    }
  }
  return { paste, followup, openUrl, raw: text };
}

async function getAction(id) {
  const bundle = await getStatusBundle();
  const aid = String(id).padStart(3, '0');
  const row =
    (bundle.actions || []).find((a) => a.id === aid || a.id === String(id)) ||
    null;
  if (!row) throw new Error(`Action ${id} not found`);
  const actionFile = row.action_file
    ? path.join(THIS_WEEK, row.action_file)
    : null;
  let detail = { paste: '', followup: '', openUrl: row.url || '', raw: '' };
  if (actionFile && fs.existsSync(actionFile)) {
    detail = extractPasteFromFile(actionFile);
  }
  return { ...row, ...detail };
}

async function markDone(id, { awaiting_reply = false, skip = false } = {}) {
  const args = ['--id', String(id).padStart(3, '0')];
  if (awaiting_reply) args.push('--awaiting-reply');
  if (skip) args.push('--skip');
  await runScript('mark_done.py', args, { timeoutMs: 30000 });
  return getStatusBundle();
}

async function copyNext() {
  const bundle = await getStatusBundle();
  const pending = (bundle.actions || []).filter((a) =>
    ['pending', 'awaiting_reply'].includes((a.status || '').toLowerCase())
  );
  const prefer = pending.filter((a) =>
    ['reply', 'followup', 'comment', 'engage', 'group_comment'].includes(
      (a.type || '').toLowerCase()
    )
  );
  const pick = prefer[0] || pending[0];
  if (!pick) return { empty: true };
  const detail = await getAction(pick.id);
  return { empty: false, ...detail };
}

function getScheduleCsv() {
  const p = path.join(THIS_WEEK, 'schedule_export.csv');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

async function setupCheck() {
  try {
    const { stdout, stderr } = await runScript('setup_check.py', [], {
      timeoutMs: 20000,
    });
    return { ok: true, output: stdout || stderr };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

function startRun(action, body = {}) {
  const conf = RUN_MAP[action];
  if (!conf) throw new Error(`Unknown action: ${action}`);
  const job = readJob();
  if (job.status === 'running') {
    const err = new Error('A job is already running. Wait for it to finish.');
    err.code = 'JOB_BUSY';
    throw err;
  }

  const args = conf.args(body || {});
  const started = {
    status: 'running',
    action,
    script: conf.script,
    args,
    started_at: new Date().toISOString(),
    log_tail: '',
    error: null,
    finished_at: null,
  };
  writeJob(started);

  const python = resolvePython();
  const scriptPath = path.join(SCRIPTS_DIR, conf.script);
  const child = spawn(python, [scriptPath, ...args], {
    cwd: SCRIPTS_DIR,
    env: loadScriptsEnv(),
  });

  let log = '';
  const append = (chunk) => {
    log += chunk.toString();
    if (log.length > 12000) log = log.slice(-12000);
    writeJob({ ...readJob(), status: 'running', log_tail: log });
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('error', (err) => {
    writeJob({
      ...readJob(),
      status: 'error',
      error: err.message,
      log_tail: log,
      finished_at: new Date().toISOString(),
    });
  });
  child.on('close', (code) => {
    writeJob({
      status: code === 0 ? 'ok' : 'error',
      action,
      script: conf.script,
      args,
      started_at: started.started_at,
      finished_at: new Date().toISOString(),
      log_tail: log,
      error: code === 0 ? null : `Exit code ${code}`,
      exit_code: code,
    });
  });

  return started;
}

module.exports = {
  getStatusBundle,
  getBrief,
  getAction,
  markDone,
  copyNext,
  getScheduleCsv,
  setupCheck,
  startRun,
  readJob,
  scripts_dir: SCRIPTS_DIR,
  social_root: SOCIAL_ROOT,
  THIS_WEEK,
};
