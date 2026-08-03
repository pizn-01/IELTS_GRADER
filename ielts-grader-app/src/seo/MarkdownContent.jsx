import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/** Stable heading ids so TOC jump links (#section-name) work. */
function slugifyHeading(text = '') {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function addHeadingIds(html = '') {
  return html.replace(/<h([2-3])>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const id = slugifyHeading(inner);
    if (!id) return `<h${level}>${inner}</h${level}>`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

export default function MarkdownContent({ content, className = '' }) {
  const html = addHeadingIds(marked.parse(content || ''));

  return (
    <div
      className={`seo-markdown text-[#374151] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export { SeoCta } from './SeoBlocks';
