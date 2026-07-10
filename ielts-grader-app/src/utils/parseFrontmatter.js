/**
 * Parse YAML-like frontmatter from markdown (no external deps).
 */
export function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) {
    return { data: {}, content: raw };
  }
  const end = raw.indexOf('---', 3);
  if (end === -1) {
    return { data: {}, content: raw };
  }
  const front = raw.slice(3, end).trim();
  const content = raw.slice(end + 3).trim();
  const data = {};
  for (const line of front.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, content };
}

export function stripMarkdownForExcerpt(md, maxLen = 160) {
  const text = md
    .replace(/^#.+$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}
