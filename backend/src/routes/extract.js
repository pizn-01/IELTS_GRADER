const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Optional auth — marketing upload works before login; JWT used when present.
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // ignore invalid token for extract/detect
  }
  next();
}

const PYTHON_DIR = path.join(__dirname, '..', '..', 'python');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function resolvePythonExecutable() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const posixVenv = path.join(PYTHON_DIR, '.venv', 'bin', 'python3');
  if (fs.existsSync(posixVenv)) return posixVenv;
  const winVenv = path.join(PYTHON_DIR, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(winVenv)) return winVenv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function extractJson(output) {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in script output.');
  }
  return JSON.parse(output.slice(start, end + 1));
}

function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const python = resolvePythonExecutable();
    const child = spawn(python, [path.join(PYTHON_DIR, scriptName), ...args], { cwd: PYTHON_DIR });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      console.error(`[extract/${scriptName}]`, d.toString());
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start ${scriptName}: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`${scriptName} exited with code ${code}: ${stderr.slice(0, 2000)}`));
        return;
      }
      try {
        resolve(extractJson(stdout));
      } catch (err) {
        reject(new Error(`Failed to parse ${scriptName} output: ${err.message}`));
      }
    });
  });
}

const TASK_MAP = {
  'task1-letter': { exam_type: 'General', task_type: 'Task 1' },
  'task1-report': { exam_type: 'Academic', task_type: 'Task 1' },
  task2: { exam_type: 'Academic', task_type: 'Task 2' },
};

// ─── POST /api/extract ───────────────────────────────────────────────────────
// Multipart file → OCRHandler.py → { text }
router.post('/extract', optionalAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const ext = path.extname(req.file.originalname || '').toLowerCase();
  if (ext === '.doc') {
    return res.status(400).json({
      error: 'Old .doc files are not supported. Please upload a .docx, PDF, or image (JPG/PNG).',
    });
  }

  const tmpPath = path.join(
    os.tmpdir(),
    `extract-${crypto.randomUUID()}${ext || ''}`,
  );

  try {
    await fs.promises.writeFile(tmpPath, req.file.buffer);
    const result = await runPythonScript('OCRHandler.py', ['--image_path', tmpPath]);
    const text = (result.text || '').trim();

    if (!text) {
      return res.status(422).json({ error: 'No text could be extracted from this file.' });
    }
    if (text.startsWith('Error:') || text.startsWith('Processing Error:')) {
      return res.status(422).json({ error: text });
    }

    return res.json({ text });
  } catch (err) {
    console.error('[extract]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to extract text from file.' });
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
});

// ─── POST /api/detect-task ───────────────────────────────────────────────────
// { questionText } → ImportedQuestionAnalyzer → exam_type / task_type
router.post('/detect-task', optionalAuth, async (req, res) => {
  const questionText = (req.body?.questionText || '').trim();
  if (!questionText) {
    return res.status(400).json({ error: 'questionText is required.' });
  }

  try {
    const result = await runPythonScript('ImportedQuestionAnalyzer.py', [
      '--question-text',
      questionText,
    ]);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const task = result.task;
    const mapped = TASK_MAP[task];
    if (!mapped) {
      return res.status(422).json({ error: 'Could not determine the IELTS task type from the text.' });
    }

    return res.json({
      exam_type: mapped.exam_type,
      task_type: mapped.task_type,
      task,
      confidence: result.confidence ?? null,
      prompt: result.prompt || result.cleanedQuestion || questionText,
      bulletPoints: Array.isArray(result.bulletPoints) ? result.bulletPoints : [],
      letterType: result.letterType || null,
      openingLine: result.openingLine || '',
      chartType: result.chartType || null,
      warnings: result.warnings || [],
    });
  } catch (err) {
    console.error('[detect-task]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to detect task type.' });
  }
});

module.exports = router;
