#!/usr/bin/env node
/**
 * Post-build prerender for SEO routes.
 * Run after `vite build`: node scripts/prerender.mjs
 *
 * Writes one HTML file per route under dist/ so Vercel can serve real
 * content (title, canonical, body) to crawlers instead of the empty SPA shell.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Prerenderer from '@prerenderer/prerenderer';
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer';
import { getPrerenderRoutes } from '../prerender-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '../dist');
const shellPath = path.join(staticDir, '.spa-shell.html');
const indexPath = path.join(staticDir, 'index.html');
const routes = getPrerenderRoutes();

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

function stripAll(html, regex) {
  return html.replace(regex, '');
}

/**
 * Normalize head tags for a specific route. Prefer Helmet/og values over any
 * leftover tags baked into a previous homepage snapshot.
 */
function cleanPrerenderHtml(html, route) {
  let out = html;
  const canonical = expectedCanonical(route);

  // Drop ad/tracker scripts injected while Puppeteer loaded the page
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
  const ogUrl =
    [...out.matchAll(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi)]
      .map((m) => m[0].match(/\bcontent=["']([^"']+)["']/i)?.[1])
      .filter(Boolean)
      .find((url) => url === canonical) || canonical;
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
    `<meta property="og:url" content="${ogUrl}">`,
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

async function writeRenderedRoutes(rendered) {
  const written = [];
  for (const { originalRoute, route, html } of rendered) {
    const key = originalRoute || route;
    const cleaned = cleanPrerenderHtml(html, key);
    assertUsefulHtml(key, cleaned);
    const out = outputPathForRoute(key);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, cleaned, 'utf8');
    written.push({ route: key, bytes: cleaned.length, file: path.relative(staticDir, out) });
  }
  return written;
}

async function main() {
  ensureSpaShell();

  console.log(`Prerendering ${routes.length} routes...`);

  const prerenderer = new Prerenderer({
    staticDir,
    renderer: new PuppeteerRenderer({
      renderAfterDocumentEvent: 'render-event',
      headless: true,
      maxConcurrentRoutes: 2,
      timeout: 60000,
      puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    }),
  });

  await prerenderer.initialize();
  let rendered;
  try {
    rendered = await prerenderer.renderRoutes(routes);
  } finally {
    await prerenderer.destroy();
  }

  if (!rendered?.length) {
    throw new Error('Prerender returned no routes');
  }
  if (rendered.length < routes.length) {
    const got = new Set(rendered.map((r) => r.originalRoute || r.route));
    const missing = routes.filter((r) => !got.has(r));
    throw new Error(`Prerender missed ${missing.length} routes: ${missing.slice(0, 8).join(', ')}`);
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
