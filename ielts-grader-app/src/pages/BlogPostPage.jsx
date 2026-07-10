import { Link, Navigate, useParams } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import MarkdownContent, { SeoCta } from '../seo/MarkdownContent';
import { getPostBySlug } from '../content/blogLoader';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const path = `/blog/${post.slug}`;
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
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ieltsgrader.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://ieltsgrader.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://ieltsgrader.com${path}` },
    ],
  };

  return (
    <SeoLayout
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { href: '/blog', label: 'Blog' },
        { href: path, label: post.title.slice(0, 40) },
      ]}
    >
      <SeoHead
        title={post.title}
        description={post.description}
        path={path}
        type="article"
        jsonLd={[jsonLd, breadcrumbLd]}
      />

      <article>
        <p className="text-xs text-[#9CA3AF] mb-2">
          {post.publishedAt} · {post.type}
        </p>
        <MarkdownContent content={post.content} />
        <SeoCta />
        <p className="mt-8 text-sm text-[#6B7280]">
          <Link to="/ielts-essay-checker" className="text-[#3B82F6] no-underline hover:underline">
            Check your essay with the AI tutor
          </Link>
          {' · '}
          <Link to="/ielts-ai-tutor" className="text-[#3B82F6] no-underline hover:underline">
            What is IELTS AI Tutor?
          </Link>
        </p>
      </article>
    </SeoLayout>
  );
}
