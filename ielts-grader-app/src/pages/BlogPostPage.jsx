import { Link, Navigate, useParams } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import MarkdownContent from '../seo/MarkdownContent';
import { SeoCta } from '../seo/SeoBlocks';
import { getPostBySlug, blogPosts } from '../content/blogLoader';

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

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const path = `/blog/${post.slug}`;
  const titleClean = (post.title || '').replace(/\s*\|\s*IELTS AI Tutor.*$/i, '');
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
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { href: '/blog', label: 'Blog' },
        { href: path, label: titleClean.slice(0, 48) },
      ]}
      hero={{
        eyebrow: 'IELTS AI Tutor by IELTSGRADER',
        title: titleClean,
        subtitle: post.description,
        meta: `Published ${post.publishedAt || ''}${dateModified && dateModified !== post.publishedAt ? ` · Updated ${dateModified}` : ''} · ${post.type || 'article'} · ${estimateReadMinutes(post.content)} min read`,
      }}
    >
      <SeoHead
        title={post.title}
        description={post.description}
        path={path}
        type="article"
        jsonLd={schemaGraph}
      />

      <article className="max-w-3xl">
        <p className="text-[13px] text-[#6B7280] mb-8 pb-6 border-b border-[#E5E7EB]">
          Written by{' '}
          <Link to="/methodology" className="text-[#3B82F6] no-underline hover:underline">
            IELTS AI Tutor Editorial Team
          </Link>
          {' · '}Practice feedback aligned to public IELTS Writing band descriptors ·{' '}
          <Link to="/methodology" className="text-[#3B82F6] no-underline hover:underline">
            how we grade
          </Link>
          {' · '}Not an official IELTS score
        </p>

        <MarkdownContent content={bodyContent} />
        <SeoCta />

        <section className="mt-12 pt-8 border-t border-[#E5E7EB]">
          <h2 className="text-[22px] font-bold text-[#1a1f36] mb-4 font-['Nunito',_sans-serif]">
            Related reading
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {relatedFallback.map((p) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                className="rounded-[14px] border border-[#E5E7EB] p-4 no-underline hover:border-[#BFDBFE] transition-colors"
              >
                <p className="text-[11px] font-bold uppercase text-[#9CA3AF] mb-1">{p.type}</p>
                <p className="text-[14px] font-semibold text-[#1a1f36] leading-snug m-0">
                  {(p.title || '').replace(/\s*\|\s*IELTS AI Tutor.*$/i, '')}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#6B7280]">
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
    </SeoLayout>
  );
}
