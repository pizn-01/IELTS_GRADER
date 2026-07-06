const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { supabaseAdmin } = require('./supabase');
const { buildFullDossier } = require('./learningDossier');

const PYTHON_DIR = path.join(__dirname, '..', '..', 'python');

function resolvePythonExecutable() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const posixVenv = path.join(PYTHON_DIR, '.venv', 'bin', 'python3');
  if (fs.existsSync(posixVenv)) return posixVenv;
  const winVenv = path.join(PYTHON_DIR, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(winVenv)) return winVenv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function runLearningScript(dossierPath, outputPath) {
  return new Promise((resolve, reject) => {
    const python = resolvePythonExecutable();
    const script = path.join(PYTHON_DIR, 'generate_learning_material.py');
    const child = spawn(python, [script, '--dossier', dossierPath, '--output', outputPath], {
      cwd: PYTHON_DIR,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      console.error('[learningGenerator]', d.toString());
    });

    child.on('error', (err) => reject(new Error(`Failed to start generator: ${err.message}`)));

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Generator exited ${code}: ${stderr.slice(0, 3000)}`));
        return;
      }
      try {
        const start = stdout.indexOf('{');
        const end = stdout.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON in output');
        resolve(JSON.parse(stdout.slice(start, end + 1)));
      } catch (err) {
        reject(new Error(`Failed to parse generator output: ${err.message}`));
      }
    });
  });
}

async function generateEditionPdf(userId, editionNumber) {
  const { data: edition, error: fetchErr } = await supabaseAdmin
    .from('personalized_learning_editions')
    .select('*')
    .eq('user_id', userId)
    .eq('edition_number', editionNumber)
    .single();

  if (fetchErr || !edition) {
    throw new Error(`Edition ${editionNumber} not found.`);
  }

  await supabaseAdmin
    .from('personalized_learning_editions')
    .update({ status: 'generating', error_message: null })
    .eq('id', edition.id);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-'));
  const dossierPath = path.join(tmpDir, 'dossier.json');
  const outputPath = path.join(tmpDir, `edition-${editionNumber}.pdf`);

  try {
    let dossier = edition.dossier_snapshot;
    if (!dossier || !dossier.exams || dossier.exams.length < 5) {
      dossier = await buildFullDossier(userId, editionNumber);
      await supabaseAdmin
        .from('personalized_learning_editions')
        .update({ dossier_snapshot: dossier })
        .eq('id', edition.id);
    }

    fs.writeFileSync(dossierPath, JSON.stringify(dossier));

    const result = await runLearningScript(dossierPath, outputPath);
    const pdfPath = result.pdf_path || outputPath;

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file was not created.');
    }

    const storagePath = `${userId}/edition-${editionNumber}.pdf`;
    const pdfBuffer = fs.readFileSync(pdfPath);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('learning-materials')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    await supabaseAdmin
      .from('personalized_learning_editions')
      .update({
        status: 'ready',
        pdf_storage_path: storagePath,
        dossier_snapshot: dossier,
        generated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', edition.id);

    console.log(`[learningGenerator] Edition ${editionNumber} ready for user ${userId}`);
    return { storagePath, page_count: result.page_count };
  } catch (err) {
    await supabaseAdmin
      .from('personalized_learning_editions')
      .update({ status: 'failed', error_message: err.message.slice(0, 2000) })
      .eq('id', edition.id);
    throw err;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

module.exports = { generateEditionPdf };
