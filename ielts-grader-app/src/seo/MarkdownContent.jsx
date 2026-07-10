import { marked } from 'marked';
import { Link } from 'react-router-dom';

marked.setOptions({ gfm: true, breaks: true });

export default function MarkdownContent({ content, className = '' }) {
  const html = marked.parse(content);

  return (
    <div
      className={`seo-markdown prose prose-slate max-w-none text-[#374151] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function SeoCta({ label = 'Get your free band score', href = '/signup' }) {
  return (
    <div className="mt-10 p-6 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
      <p className="text-[#1a1f36] font-semibold mb-3">Try IELTS AI Tutor free</p>
      <p className="text-[#6B7280] text-sm mb-4">
        Get criterion-level feedback and a personalized study plan in about 60 seconds.
      </p>
      <Link
        to={href}
        className="inline-block px-5 py-2.5 bg-[#3B82F6] text-white rounded-lg text-sm font-semibold no-underline hover:bg-[#2563EB] transition-colors"
      >
        {label}
      </Link>
    </div>
  );
}
