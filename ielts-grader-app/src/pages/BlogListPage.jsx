import { Link } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import { SeoCta, SeoPrimaryButton, SeoSecondaryButton } from '../seo/SeoBlocks';
import { blogPosts } from '../content/blogLoader';
import { stripMarkdownForExcerpt } from '../utils/parseFrontmatter';

const TYPE_STYLES = {
  guide: 'bg-[#EFF6FF] text-[#1D4ED8]',
  sample: 'bg-[#ECFDF5] text-[#047857]',
  plan: 'bg-[#FFF7ED] text-[#C2410C]',
  trust: 'bg-[#F5F3FF] text-[#6D28D9]',
  comparison: 'bg-[#FDF2F8] text-[#BE185D]',
};

function estimateReadMinutes(content = '') {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

export default function BlogListPage() {
  return (
    <SeoLayout
      wide
      breadcrumbs={[{ href: '/', label: 'Home' }, { href: '/blog', label: 'Blog' }]}
      hero={{
        eyebrow: 'IELTS AI Tutor by IELTSGRADER',
        title: 'IELTS Writing Blog',
        subtitle:
          'Guides, scored samples, and study plans from your AI writing tutor, built to help you move from feedback to a higher band.',
        actions: (
          <>
            <SeoPrimaryButton to="/ielts-essay-checker">Check your essay free</SeoPrimaryButton>
            <SeoSecondaryButton to="/ielts-ai-tutor">What is IELTS AI Tutor?</SeoSecondaryButton>
          </>
        ),
      }}
    >
      <SeoHead
        title="IELTS Writing Blog: Tips, Samples & AI Tutor Guides | IELTSGRADER"
        description="IELTS writing guides, band score samples, and study plans from your AI tutor. Task 1, Task 2, mock exams, error taxonomy, and more."
        path="/blog"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
        {blogPosts.map((post) => {
          const typeClass = TYPE_STYLES[post.type] || 'bg-[#F3F4F6] text-[#4B5563]';
          const minutes = estimateReadMinutes(post.content);
          const title = (post.title || '').replace(/\s*\|\s*IELTS AI Tutor.*$/i, '');
          return (
            <article
              key={post.slug}
              className="group flex flex-col rounded-[20px] border border-[#E5E7EB] bg-white p-6 hover:border-[#BFDBFE] hover:shadow-[0_12px_40px_-20px_rgba(59,130,246,0.35)] transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${typeClass}`}>
                  {post.type || 'article'}
                </span>
                <span className="text-[12px] text-[#9CA3AF]">{minutes} min read</span>
              </div>
              <Link
                to={`/blog/${post.slug}`}
                className="text-[18px] font-bold text-[#1a1f36] no-underline group-hover:text-[#3B82F6] transition-colors leading-snug font-['Nunito',_sans-serif]"
              >
                {title}
              </Link>
              <p className="mt-3 text-[14px] text-[#6B7280] leading-relaxed flex-1">
                {post.description || stripMarkdownForExcerpt(post.content, 140)}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-[12px] text-[#9CA3AF]">{post.publishedAt}</span>
                <Link
                  to={`/blog/${post.slug}`}
                  className="text-[13px] font-semibold text-[#3B82F6] no-underline hover:underline"
                >
                  Read more →
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <SeoCta />
    </SeoLayout>
  );
}
