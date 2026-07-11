import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

export default function MarkdownContent({ content, className = '' }) {
  const html = marked.parse(content || '');

  return (
    <div
      className={`seo-markdown text-[#374151] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export { SeoCta } from './SeoBlocks';
