import { parseFrontmatter } from '../utils/parseFrontmatter';

const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default', eager: true });

function loadPosts() {
  const posts = Object.entries(modules).map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    if (data.status !== 'published') return null;
    return {
      ...data,
      content,
      path,
    };
  }).filter(Boolean);

  return posts.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

export const blogPosts = loadPosts();

export function getPostBySlug(slug) {
  return blogPosts.find((p) => p.slug === slug) ?? null;
}

export const blogSlugs = blogPosts.map((p) => p.slug);
