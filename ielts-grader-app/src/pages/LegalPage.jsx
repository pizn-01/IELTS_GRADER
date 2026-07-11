import { Navigate, useLocation, Link } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import { legalPages } from '../content/legalContent';

const LEGAL_SLUGS = new Set(['terms', 'privacy', 'cookies']);

export default function LegalPage() {
  const location = useLocation();
  const page = location.pathname.replace(/^\//, '');
  const data = legalPages[page];

  if (!data || !LEGAL_SLUGS.has(page)) {
    return <Navigate to="/" replace />;
  }

  const path = `/${page}`;

  return (
    <SeoLayout
      wide
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { href: path, label: data.heading },
      ]}
      hero={{
        eyebrow: 'IELTS AI Tutor by IELTSGRADER',
        title: data.heading,
        subtitle: data.description,
        meta: data.updatedAt ? `Last updated: ${data.updatedAt}` : undefined,
      }}
    >
      <SeoHead title={data.title} description={data.description} path={path} />

      <div className="grid lg:grid-cols-[240px_1fr] gap-10 lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF] mb-3">On this page</p>
            <nav className="flex flex-col gap-2">
              {data.sections.map((section) => (
                <a
                  key={section.heading}
                  href={`#${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                  className="text-[13px] text-[#6B7280] no-underline hover:text-[#3B82F6] leading-snug"
                >
                  {section.heading}
                </a>
              ))}
            </nav>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex flex-col gap-2">
              <Link to="/terms" className="text-[13px] text-[#3B82F6] no-underline hover:underline">Terms</Link>
              <Link to="/privacy" className="text-[13px] text-[#3B82F6] no-underline hover:underline">Privacy</Link>
              <Link to="/cookies" className="text-[13px] text-[#3B82F6] no-underline hover:underline">Cookies</Link>
            </div>
          </div>
        </aside>

        <article className="max-w-3xl space-y-8">
          {data.sections.map((section) => {
            const id = section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            return (
              <section key={section.heading} id={id} className="scroll-mt-28">
                <h2 className="text-[20px] md:text-[22px] font-bold text-[#1a1f36] mb-3 font-['Nunito',_sans-serif]">
                  {section.heading}
                </h2>
                {section.body && (
                  <p className={`text-[15px] leading-relaxed ${section.muted ? 'text-[#9CA3AF]' : 'text-[#374151]'}`}>
                    {section.body}
                  </p>
                )}
                {section.items && (
                  <ul className="mt-3 list-disc pl-5 space-y-2 text-[15px] text-[#374151] leading-relaxed">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.link && (
                  <p className="mt-3">
                    <Link to={section.link.href} className="text-[#3B82F6] no-underline hover:underline font-medium">
                      {section.link.label} →
                    </Link>
                  </p>
                )}
              </section>
            );
          })}
        </article>
      </div>
    </SeoLayout>
  );
}
