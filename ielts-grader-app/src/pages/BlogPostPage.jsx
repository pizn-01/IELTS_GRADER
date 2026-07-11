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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'IELTS AI Tutor by IELTSGRADER',
    },
    publisher: {
      '@type': 'Organization',
      name: 'IELTSGRADER',
      url: 'https://ieltsgrader.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://ieltsgrader.com${path}`,
    },
    image: 'https://ieltsgrader.com/og-image.jpg',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ieltsgrader.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://ieltsgrader.com/blog' },
      { '@type': 'ListItem', position: 3, name: titleClean, item: `https://ieltsgrader.com${path}` },
    ],
  };

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
        meta: `${post.publishedAt || ''} · ${post.type || 'article'} · ${estimateReadMinutes(post.content)} min read`,
      }}
    >
      <SeoHead
        title={post.title}
        description={post.description}
        path={path}
        type="article"
        jsonLd={[jsonLd, breadcrumbLd]}
      />

      <article className="max-w-3xl">
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
