// Polyfill: some browsers lack Uint8Array.prototype.toHex which newer
// pdfjs-dist versions rely on. Adding it here prevents the
// "a.toHex is not a function" crash on those browsers.
if (typeof Uint8Array.prototype.toHex !== 'function') {
  Uint8Array.prototype.toHex = function () {
    return Array.from(this)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };
}

import * as pdfjsLib from 'pdfjs-dist';

// Point pdf.js at its bundled worker so Vite can resolve it correctly
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

const readAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsArrayBuffer(file);
  });

const readAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file, 'UTF-8');
  });

const extractPdf = async (file) => {
  const arrayBuffer = await readAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => item.str).join(' '));
  }
  return parts.join('\n');
};

const extractDocx = async (file) => {
  const mammoth = await import('mammoth');
  const arrayBuffer = await readAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/**
 * Extracts plain text from a file regardless of format.
 * Supports: .txt, .pdf, .doc, .docx
 * Throws an Error with a user-friendly message for unsupported or unreadable files.
 */
export const extractFileText = async (file) => {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (
    type === 'application/pdf' ||
    name.endsWith('.pdf')
  ) {
    return extractPdf(file);
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return extractDocx(file);
  }

  // Plain text fallback (.txt, no extension, etc.)
  const text = await readAsText(file);
  if (text.includes('\u0000')) {
    throw new Error(
      'Unsupported file type. Please upload a .txt, .pdf, or .docx file.',
    );
  }
  return text;
};
