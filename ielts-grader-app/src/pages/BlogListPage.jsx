import { Link } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import { SeoCta, SeoPrimaryButton, SeoSecondaryButton } from '../seo/SeoBlocks';
import { blogPosts } from '../content/blogLoader';
import { stripMarkdownForExcerpt } from '../utils/parseFrontmatter';
import { cleanPostTitle, getTypeStyle } from './blog/blogTypeStyles';

function estimateReadMinutes(content = '') {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

export default function BlogListPage() {
  const [featured, ...rest] = blogPosts;
  const featuredTitle = cleanPostTitle(featured?.title || '');
  const featuredMinutes = featured ? estimateReadMinutes(featured.content) : 0;
  const featuredStyle = getTypeStyle(featured?.type);

  return (
    <SeoLayout
      wide
      variant="editorial"
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

      {featured && (
        <Link
          to={`/blog/${featured.slug}`}
          className="blog-featured-card group relative mb-8 md:mb-10 block no-underline overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_24px_60px_-28px_rgba(26,31,54,0.35)]"
        >
          <span className={`absolute inset-x-0 top-0 h-[3px] ${featuredStyle.bar}`} aria-hidden="true" />
          <div className="p-7 md:p-10 lg:p-12 grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                  Featured
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${featuredStyle.chip}`}>
                  {featured.type || 'article'}
                </span>
                <span className="text-[12px] text-[#9CA3AF]">{featuredMinutes} min read</span>
              </div>
              <h2 className="m-0 text-[26px] md:text-[34px] lg:text-[38px] font-extrabold text-[#1a1f36] tracking-tight leading-[1.15] font-['Nunito',_sans-serif] group-hover:text-[#3B82F6] transition-colors">
                {featuredTitle}
              </h2>
              <p className="mt-4 mb-0 text-[15px] md:text-[16px] text-[#6B7280] leading-relaxed max-w-2xl">
                {featured.description || stripMarkdownForExcerpt(featured.content, 180)}
              </p>
            </div>
            <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-4">
              <span className="text-[12px] text-[#9CA3AF]">{featured.publishedAt}</span>
              <span className="inline-flex items-center text-[14px] font-bold text-[#3B82F6]">
                Read article
                <span className="ml-1.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </span>
            </div>
          </div>
        </Link>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
        {rest.map((post) => {
          const style = getTypeStyle(post.type);
          const minutes = estimateReadMinutes(post.content);
          const title = cleanPostTitle(post.title || '');
          return (
            <article
              key={post.slug}
              className="blog-list-card group relative flex flex-col rounded-[18px] border border-[#E5E7EB] bg-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_18px_48px_-24px_rgba(26,31,54,0.32)]"
            >
              <span className={`absolute inset-x-0 top-0 h-[3px] ${style.bar}`} aria-hidden="true" />
              <div className="flex flex-col flex-1 p-6 pt-7">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${style.chip}`}>
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
                <p className="mt-3 text-[14px] text-[#6B7280] leading-relaxed flex-1 mb-0">
                  {post.description || stripMarkdownForExcerpt(post.content, 140)}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[12px] text-[#9CA3AF]">{post.publishedAt}</span>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="text-[13px] font-semibold text-[#3B82F6] no-underline inline-flex items-center gap-1"
                  >
                    Read more
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <SeoCta tone="editorial" />
    </SeoLayout>
  );
}
