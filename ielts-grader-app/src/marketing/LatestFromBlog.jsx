import { Link } from 'react-router-dom';
import { blogPosts } from '../content/blogLoader';

/**
 * Homepage crawl path: latest published posts → /blog hubs.
 * Keeps first viewport lean — placed after Features, before Testimonials.
 */
export default function LatestFromBlog({ limit = 4 }) {
  const posts = blogPosts.slice(0, limit);
  if (!posts.length) return null;

  return (
    <section
      id="latest-from-blog"
      className="bg-white py-[50px] border-t border-[#E5E7EB]"
      aria-labelledby="latest-blog-heading"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[100px]">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <p className="m-0 text-[13px] font-semibold uppercase tracking-wide text-[#3B82F6] mb-2">
              From the blog
            </p>
            <h2
              id="latest-blog-heading"
              className="m-0 text-[28px] md:text-[34px] font-bold text-[#1a1f36] leading-tight tracking-tight font-['Nunito',_sans-serif]"
            >
              Latest IELTS Writing guides
            </h2>
            <p className="mt-3 mb-0 text-[15px] text-[#6B7280] leading-relaxed">
              Structure maps, essay types, and criterion fixes — then check your next draft with the AI tutor.
            </p>
          </div>
          <Link
            to="/blog"
            className="text-[#101828] font-semibold no-underline text-[15px] hover:text-[#3B82F6] transition-colors font-['Nunito',_sans-serif] shrink-0"
          >
            View all posts →
          </Link>
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none m-0 p-0">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="block h-full rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 no-underline hover:border-[#BFDBFE] transition-colors"
              >
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  {post.type || 'guide'}
                </p>
                <h3 className="mt-2 mb-2 text-[16px] font-bold text-[#1a1f36] leading-snug font-['Nunito',_sans-serif]">
                  {post.title}
                </h3>
                <p className="m-0 text-[13px] text-[#6B7280] leading-relaxed line-clamp-3">
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
