import { useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import MarkdownContent from '../seo/MarkdownContent';
import { SeoCta } from '../seo/SeoBlocks';
import { getPostBySlug, blogPosts } from '../content/blogLoader';
import BlogReadingProgress from './blog/BlogReadingProgress';
import BlogToc, { extractH2Headings } from './blog/BlogToc';
import { cleanPostTitle, getTypeStyle } from './blog/blogTypeStyles';

function estimateReadMinutes(content = '') {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

/** Extract Q&A pairs from a "## Frequently asked questions" section for FAQPage schema. */
function extractFaqs(content = '') {
  const match = content.match(/##\s+Frequently asked questions\s*\n([\s\S]*?)(?=\n##\s+|$)/i);
  if (!match) return [];
  const block = match[1].trim();
  const faqs = [];
  const parts = block.split(/\n###\s+/);
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (i === 0) part = part.replace(/^###\s+/, '');
    if (!part) continue;
    const nl = part.indexOf('\n');
    if (nl === -1) continue;
    const q = part.slice(0, nl).trim();
    const a = part
      .slice(nl + 1)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (q && a) faqs.push({ q, a });
  }
  return faqs;
}

function MetaChip({ children, strong = false }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] tracking-wide ${
        strong
          ? 'bg-[#1a1f36] text-white font-semibold'
          : 'bg-white/80 text-[#4B5563] font-medium border border-[#E5E7EB] backdrop-blur-sm'
      }`}
    >
      {children}
    </span>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);
  const articleRef = useRef(null);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const path = `/blog/${post.slug}`;
  const titleClean = cleanPostTitle(post.title || '');
  // Hero already shows H1 — avoid duplicate from markdown
  const bodyContent = (post.content || '').replace(/^#\s+.+\n+/, '');
  const related = blogPosts
    .filter((p) => p.slug !== post.slug)
    .filter((p) => p.type === post.type || p.keyword === post.keyword)
    .slice(0, 3);
  const relatedFallback = related.length
    ? related
    : blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const dateModified = post.updatedAt || post.publishedAt;
  const faqs = extractFaqs(bodyContent);
  const headings = extractH2Headings(bodyContent);
  const minutes = estimateReadMinutes(post.content);
  const typeStyle = getTypeStyle(post.type);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified,
    author: {
      '@type': 'Organization',
      name: 'IELTS AI Tutor Editorial Team',
      url: 'https://www.ieltsgrader.com/methodology',
    },
    publisher: {
      '@type': 'Organization',
      name: 'IELTSGRADER',
      url: 'https://www.ieltsgrader.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.ieltsgrader.com/favicon-512x512.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.ieltsgrader.com${path}`,
    },
    image: 'https://www.ieltsgrader.com/og-image.jpg',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ieltsgrader.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.ieltsgrader.com/blog' },
      { '@type': 'ListItem', position: 3, name: titleClean, item: `https://www.ieltsgrader.com${path}` },
    ],
  };

  const faqLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const schemaGraph = [jsonLd, breadcrumbLd, faqLd].filter(Boolean);

  return (
    <SeoLayout
      variant="editorial"
      wide
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { href: '/blog', label: 'Blog' },
        { href: path, label: titleClean.slice(0, 48) },
      ]}
      hero={{
        eyebrow: 'IELTS AI Tutor by IELTSGRADER',
        title: titleClean,
        subtitle: post.description,
        metaNodes: (
          <>
            <MetaChip strong>{post.type || 'article'}</MetaChip>
            {post.publishedAt && <MetaChip>Published {post.publishedAt}</MetaChip>}
            {dateModified && dateModified !== post.publishedAt && (
              <MetaChip>Updated {dateModified}</MetaChip>
            )}
            <MetaChip>{minutes} min read</MetaChip>
          </>
        ),
      }}
    >
      <SeoHead
        title={post.title}
        description={post.description}
        path={path}
        type="article"
        jsonLd={schemaGraph}
      />

      <BlogReadingProgress targetRef={articleRef} />

      <div className="grid lg:grid-cols-[220px_minmax(0,48rem)] gap-10 lg:gap-14 xl:gap-16">
        <BlogToc headings={headings} />

        <article ref={articleRef} className="min-w-0 max-w-3xl">
          <div className="blog-author-bar flex items-start gap-3.5 mb-10 pb-7 border-b border-[#E5E7EB]">
            <div
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white tracking-wide"
              style={{ background: `linear-gradient(145deg, #1a1f36 0%, ${typeStyle.accent} 160%)` }}
              aria-hidden="true"
            >
              IT
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[14px] font-bold text-[#1a1f36] leading-snug">
                <Link to="/methodology" className="text-[#1a1f36] no-underline hover:text-[#3B82F6] transition-colors">
                  IELTS AI Tutor Editorial Team
                </Link>
              </p>
              <p className="m-0 mt-1 text-[13px] text-[#6B7280] leading-relaxed">
                Practice feedback aligned to public IELTS Writing band descriptors ·{' '}
                <Link to="/methodology" className="text-[#3B82F6] no-underline hover:underline">
                  how we grade
                </Link>
                {' · '}Not an official IELTS score
              </p>
            </div>
          </div>

          <MarkdownContent content={bodyContent} />
          <SeoCta tone="editorial" />

          <section className="mt-14 pt-10 border-t border-[#E5E7EB]">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-2 m-0">
              Keep reading
            </p>
            <h2 className="text-[24px] md:text-[26px] font-extrabold text-[#1a1f36] mb-6 mt-0 font-['Nunito',_sans-serif] tracking-tight">
              Related reading
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedFallback.map((p) => {
                const style = getTypeStyle(p.type);
                return (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="blog-related-card group relative flex flex-col rounded-[16px] border border-[#E5E7EB] bg-white p-4 pl-5 no-underline overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-[0_16px_40px_-24px_rgba(26,31,54,0.35)]"
                  >
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${style.bar}`}
                      aria-hidden="true"
                    />
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-2 m-0">
                      {p.type}
                    </p>
                    <p className="text-[14px] font-semibold text-[#1a1f36] leading-snug m-0 group-hover:text-[#3B82F6] transition-colors">
                      {cleanPostTitle(p.title || '')}
                    </p>
                  </Link>
                );
              })}
            </div>
            <p className="mt-7 text-sm text-[#6B7280]">
              <Link to="/ielts-essay-checker" className="text-[#3B82F6] no-underline hover:underline">
                Check your essay with the AI tutor
              </Link>
              {' · '}
              <Link to="/ielts-ai-tutor" className="text-[#3B82F6] no-underline hover:underline">
                What is IELTS AI Tutor?
              </Link>
              {' · '}
              <Link to="/blog" className="text-[#3B82F6] no-underline hover:underline">
                All articles
              </Link>
            </p>
          </section>
        </article>
      </div>
    </SeoLayout>
  );
}
