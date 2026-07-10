#!/usr/bin/env node
/**
 * Post-build prerender for SEO routes.
 * Run after `vite build`: node scripts/prerender.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import Prerenderer from '@prerenderer/prerenderer';
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer';
import { getPrerenderRoutes } from '../prerender-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.join(__dirname, '../dist');
const routes = getPrerenderRoutes();

async function main() {
  console.log(`Prerendering ${routes.length} routes...`);

  const prerenderer = new Prerenderer({
    staticDir,
    renderer: new PuppeteerRenderer({
      renderAfterDocumentEvent: 'render-event',
      headless: true,
      maxConcurrentRoutes: 4,
    }),
  });

  await prerenderer.initialize();
  const rendered = await prerenderer.renderRoutes(routes);
  await prerenderer.destroy();

  console.log(`Prerendered ${rendered.length} pages into ${staticDir}`);
}

main().catch((err) => {
  // Puppeteer/Chromium often unavailable on Vercel — do not fail the deploy.
  console.error('Prerender failed (non-fatal):', err?.message || err);
  process.exit(0);
});
