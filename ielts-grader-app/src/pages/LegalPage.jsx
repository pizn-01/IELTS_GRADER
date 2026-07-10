import { Navigate, useLocation } from 'react-router-dom';
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
    <SeoLayout breadcrumbs={[{ href: '/', label: 'Home' }, { href: path, label: data.heading }]}>
      <SeoHead title={data.title} description={data.description} path={path} />

      {data.draft && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-6">
          Draft — pending legal review. Do not rely on this for compliance until approved.
        </p>
      )}

      <h1 className="text-3xl font-bold text-[#1a1f36] mb-8">{data.heading}</h1>

      <div className="space-y-6 text-[#374151]">
        {data.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-[#1a1f36] mb-2">{section.heading}</h2>
            {section.body && (
              <p className={section.muted ? 'text-sm text-[#9CA3AF]' : ''}>{section.body}</p>
            )}
            {section.items && (
              <ul className="list-disc pl-5 space-y-1">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.link && (
              <p className="mt-2">
                <a href={section.link.href} className="text-[#3B82F6] no-underline hover:underline">
                  {section.link.label}
                </a>
              </p>
            )}
          </section>
        ))}
      </div>
    </SeoLayout>
  );
}
