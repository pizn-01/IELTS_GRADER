import { Link } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import { blogPosts } from '../content/blogLoader';
import { stripMarkdownForExcerpt } from '../utils/parseFrontmatter';

export default function BlogListPage() {
  return (
    <SeoLayout breadcrumbs={[{ href: '/', label: 'Home' }, { href: '/blog', label: 'Blog' }]}>
      <SeoHead
        title="IELTS Writing Blog — Tips, Samples & AI Tutor Guides | IELTSGRADER"
        description="IELTS writing guides, band score samples, and study plans from your AI tutor. Task 1, Task 2, mock exams, and more."
        path="/blog"
      />

      <p className="text-sm text-[#3B82F6] font-semibold mb-2">IELTS AI Tutor by IELTSGRADER</p>
      <h1 className="text-3xl md:text-4xl font-bold text-[#1a1f36] mb-4">IELTS Writing Blog</h1>
      <p className="text-lg text-[#6B7280] mb-10">
        Guides, scored samples, and study plans from your AI writing tutor.
      </p>

      <ul className="space-y-8">
        {blogPosts.map((post) => (
          <li key={post.slug} className="border-b border-[#E5E7EB] pb-8">
            <p className="text-xs text-[#9CA3AF] mb-1 uppercase tracking-wide">{post.type}</p>
            <Link
              to={`/blog/${post.slug}`}
              className="text-xl font-bold text-[#1a1f36] hover:text-[#3B82F6] no-underline"
            >
              {post.title.replace(/ \| IELTS AI Tutor$/, '')}
            </Link>
            <p className="text-[#6B7280] mt-2 text-sm">
              {post.description || stripMarkdownForExcerpt(post.content)}
            </p>
            <Link
              to={`/blog/${post.slug}`}
              className="inline-block mt-3 text-sm text-[#3B82F6] font-semibold no-underline hover:underline"
            >
              Read more →
            </Link>
          </li>
        ))}
      </ul>
    </SeoLayout>
  );
}
