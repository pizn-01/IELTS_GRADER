import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, 'src/content/blog');

const STATIC = [
  '/',
  '/pricing',
  '/ielts-ai-tutor',
  '/ielts-essay-checker',
  '/ielts-task-1-checker',
  '/ielts-task-2-checker',
  '/ielts-writing-band-score',
  '/ielts-mock-writing-test',
  '/blog',
  '/terms',
  '/privacy',
  '/cookies',
];

function getBlogSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      const m = raw.match(/^status:\s*(\w+)/m);
      const slugM = raw.match(/^slug:\s*(\S+)/m);
      if (m?.[1] === 'published' && slugM?.[1]) {
        return slugM[1];
      }
      return null;
    })
    .filter(Boolean)
    .map((slug) => `/blog/${slug}`);
}

export function getPrerenderRoutes() {
  return [...STATIC, ...getBlogSlugs()];
}

export default getPrerenderRoutes;
