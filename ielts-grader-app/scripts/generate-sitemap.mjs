#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from prerender routes.
 * Usage: node scripts/generate-sitemap.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrerenderRoutes } from '../prerender-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../public/sitemap.xml');
const SITE = 'https://www.ieltsgrader.com';
const lastmod = new Date().toISOString().slice(0, 10);

const PRIORITY = {
  '/': 1.0,
  '/pricing': 0.7,
  '/ielts-ai-tutor': 0.9,
  '/ielts-essay-checker': 0.9,
  '/ielts-task-1-checker': 0.9,
  '/ielts-task-2-checker': 0.9,
  '/ielts-writing-band-score': 0.8,
  '/ielts-mock-writing-test': 0.8,
  '/grade-my-essay': 0.9,
  '/mock-exam': 0.8,
  '/sample-report': 0.7,
  '/features': 0.7,
  '/blog': 0.8,
  '/terms': 0.6,
  '/privacy': 0.6,
  '/cookies': 0.6,
};

function metaFor(route) {
  if (route === '/') return { changefreq: 'weekly', priority: 1.0 };
  if (route.startsWith('/blog/')) return { changefreq: 'monthly', priority: 0.7 };
  return {
    changefreq: 'monthly',
    priority: PRIORITY[route] ?? 0.7,
  };
}

const routes = getPrerenderRoutes();
const body = routes
  .map((route) => {
    const loc = route === '/' ? `${SITE}/` : `${SITE}${route}`;
    const { changefreq, priority } = metaFor(route);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Wrote ${routes.length} URLs to ${outPath} (lastmod=${lastmod})`);
