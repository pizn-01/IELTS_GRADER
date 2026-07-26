#!/usr/bin/env node
/**
 * Post-build prerender for SEO routes.
 * Run after `vite build`: node scripts/prerender.mjs
 *
 * On Vercel: puppeteer-core + @sparticuz/chromium (regular Puppeteer Chrome fails there).
 * Locally: full puppeteer with its bundled Chrome.
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrerenderRoutes } from '../prerender-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '../dist');
const shellPath = path.join(staticDir, '.spa-shell.html');
const indexPath = path.join(staticDir, 'index.html');
const routes = getPrerenderRoutes();
const isVercel = Boolean(process.env.VERCEL);

function outputPathForRoute(route) {
  const normalized = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route;
  if (normalized === '/') return path.join(staticDir, 'index.html');
  return path.join(staticDir, normalized.replace(/^\//, ''), 'index.html');
}

function expectedCanonical(route) {
  return route === '/' ? 'https://www.ieltsgrader.com/' : `https://www.ieltsgrader.com${route}`;
}

function ensureSpaShell() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath} — run vite build first`);
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const isEmptyShell = /<div id="root">\s*<\/div>/.test(indexHtml);

  if (isEmptyShell) {
    fs.writeFileSync(shellPath, indexHtml, 'utf8');
    return;
  }

  if (fs.existsSync(shellPath)) {
    fs.copyFileSync(shellPath, indexPath);
    console.log('Restored Vite SPA shell before prerender');
    return;
  }

  throw new Error(
    'dist/index.html is already prerendered and no .spa-shell.html backup exists. Run: npm run build:vite && npm run prerender',
  );
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.xml': 'application/xml',
      '.txt': 'text/plain; charset=utf-8',
    }[ext] || 'application/octet-stream'
  );
}

/** Always serve the SPA shell for document routes so React can render each path. */
function startSpaServer() {
  const shellHtml = fs.readFileSync(indexPath);

  const server = http.createServer((req, res) => {
    try {
      const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const safePath = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
      const hasExtension = path.extname(safePath) !== '';

      if (hasExtension) {
        const filePath = path.join(staticDir, safePath);
        if (!filePath.startsWith(staticDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404).end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(shellHtml);
    } catch (err) {
      res.writeHead(500).end(String(err?.message || err));
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

async function launchBrowser() {
  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: [...chromium.args, '--disable-dev-shm-usage', '--no-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 800 },
  });
}

function stripAll(html, regex) {
  return html.replace(regex, '');
}

function cleanPrerenderHtml(html, route) {
  let out = html;
  const canonical = expectedCanonical(route);

  out = out.replace(/<script[^>]*googleads\.g\.doubleclick\.net[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<script[^>]*src=["'][^"']*googleads[^"']*["'][^>]*><\/script>/gi, '');
  out = out.replace(/\sclass="lenis"/g, '');

  const ogTitle =
    [...out.matchAll(/<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/gi)]
      .map((m) => m[0].match(/\bcontent=["']([^"']+)["']/i)?.[1])
      .filter(Boolean)
      .pop();
  const ogDescription =
    [...out.matchAll(/<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/gi)]
      .map((m) => m[0].match(/\bcontent=["']([^"']+)["']/i)?.[1])
      .filter(Boolean)
      .pop();
  const description =
    [...out.matchAll(/<meta\b[^>]*\bname=["']description["'][^>]*>/gi)]
      .map((m) => m[0].match(/\bcontent=["']([^"']+)["']/i)?.[1])
      .filter(Boolean)
      .pop() || ogDescription;

  if (!ogTitle) {
    throw new Error(`No og:title found while cleaning ${route}`);
  }

  out = stripAll(out, /<title>[^<]*<\/title>/gi);
  out = stripAll(out, /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi);
  out = stripAll(out, /<meta\b[^>]*\bname=["']description["'][^>]*>/gi);
  out = stripAll(out, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi);
  out = stripAll(out, /<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/gi);
  out = stripAll(out, /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/gi);
  out = stripAll(out, /<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/gi);
  out = stripAll(out, /<meta\b[^>]*\bname=["']twitter:description["'][^>]*>/gi);

  const injected = [
    `<title>${ogTitle}</title>`,
    description ? `<meta name="description" content="${description}">` : '',
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:title" content="${ogTitle}">`,
    description ? `<meta property="og:description" content="${description}">` : '',
    `<meta name="twitter:title" content="${ogTitle}">`,
    description ? `<meta name="twitter:description" content="${description}">` : '',
  ]
    .filter(Boolean)
    .join('');

  out = out.replace(/<\/head>/i, `${injected}</head>`);
  return out;
}

function assertUsefulHtml(route, html) {
  if (!html || html.length < 2000) {
    throw new Error(`Prerender produced too little HTML for ${route} (${html?.length || 0} bytes)`);
  }
  if (/<div id="root">\s*<\/div>/.test(html)) {
    throw new Error(`Prerender left empty #root for ${route}`);
  }
  const canonicals = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)]
    .map((m) => m[0].match(/\bhref=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
  const expected = expectedCanonical(route);
  if (canonicals.length !== 1 || canonicals[0] !== expected) {
    throw new Error(
      `Prerender bad canonical on ${route}: expected ${expected}, found ${canonicals.join(', ') || 'none'}`,
    );
  }
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (!title || title === 'IELTSGRADER') {
    throw new Error(`Prerender missing page title on ${route} (got: ${title || 'none'})`);
  }
}

async function renderRoute(browser, baseUrl, route) {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.prerenderReady === '1',
      { timeout: 20000 },
    ).catch(async () => {
      // Fallback: wait for render-event via evaluate if dataset never set
      await page.waitForFunction(
        () => {
          const root = document.getElementById('root');
          const text = root?.innerText?.replace(/\s+/g, ' ').trim() || '';
          return text.length > 80 && !root?.querySelector('.animate-spin');
        },
        { timeout: 15000 },
      );
      await new Promise((r) => setTimeout(r, 100));
    });
    return await page.content();
  } finally {
    await page.close();
  }
}

async function writeRenderedRoutes(rendered) {
  const written = [];
  for (const { route, html } of rendered) {
    const cleaned = cleanPrerenderHtml(html, route);
    assertUsefulHtml(route, cleaned);
    const out = outputPathForRoute(route);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, cleaned, 'utf8');
    written.push({ route, bytes: cleaned.length, file: path.relative(staticDir, out) });
  }
  return written;
}

async function main() {
  ensureSpaShell();
  console.log(`Prerendering ${routes.length} routes (${isVercel ? 'Vercel/chromium' : 'local/puppeteer'})...`);

  const { server, baseUrl } = await startSpaServer();
  const browser = await launchBrowser();
  const rendered = [];

  try {
    // Sequential is more stable on Vercel memory limits
    for (const route of routes) {
      const html = await renderRoute(browser, baseUrl, route);
      rendered.push({ route, html });
      process.stdout.write(`  ✓ ${route}\n`);
    }
  } finally {
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }

  if (rendered.length !== routes.length) {
    throw new Error(`Prerendered ${rendered.length}/${routes.length} routes`);
  }

  const written = await writeRenderedRoutes(rendered);
  if (fs.existsSync(shellPath)) fs.unlinkSync(shellPath);
  console.log(`Prerendered ${written.length} pages into ${staticDir}`);
  for (const row of written.slice(0, 5)) {
    console.log(`  ${row.route} → ${row.file} (${row.bytes} bytes)`);
  }
  if (written.length > 5) console.log(`  …and ${written.length - 5} more`);
}

main().catch((err) => {
  console.error('Prerender failed:', err?.message || err);
  process.exit(1);
});
