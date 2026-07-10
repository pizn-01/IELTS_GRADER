import { Link } from 'react-router-dom';
import SeoLayout from './SeoLayout';
import SeoHead from './SeoHead';
import { SeoCta } from './MarkdownContent';

export default function ToolLandingPage({ page }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.h1,
    description: page.description,
    url: `https://ieltsgrader.com${page.path}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'IELTS AI Tutor by IELTSGRADER',
      url: 'https://ieltsgrader.com',
    },
  };

  return (
    <SeoLayout breadcrumbs={[{ href: '/', label: 'Home' }, { href: page.path, label: page.h1 }]}>
      <SeoHead title={page.title} description={page.description} path={page.path} jsonLd={jsonLd} />

      <p className="text-sm text-[#3B82F6] font-semibold mb-2">IELTS AI Tutor by IELTSGRADER</p>
      <h1 className="text-3xl md:text-4xl font-bold text-[#1a1f36] mb-4">{page.h1}</h1>
      <p className="text-lg text-[#6B7280] mb-8">{page.intro}</p>

      {page.sections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="text-xl font-bold text-[#1a1f36] mb-3">{section.heading}</h2>
          {section.body && <p className="text-[#374151] mb-3">{section.body}</p>}
          {section.items && (
            <ul className="list-disc pl-5 space-y-2 text-[#374151]">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <SeoCta label={page.cta.label} href={page.cta.href} />

      {page.links?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-[#1a1f36] mb-3">Related</h2>
          <ul className="space-y-2">
            {page.links.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="text-[#3B82F6] hover:underline no-underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SeoLayout>
  );
}
