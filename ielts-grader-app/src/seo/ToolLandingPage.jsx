import { Link } from 'react-router-dom';
import SeoLayout from './SeoLayout';
import SeoHead from './SeoHead';
import { SeoCta, SeoFaq, SeoFeatureGrid, SeoPrimaryButton, SeoSecondaryButton } from './SeoBlocks';
import BandScoreCalculator from './BandScoreCalculator';

export default function ToolLandingPage({ page }) {
  const faqLd = page.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.h1,
    description: page.description,
    url: `https://www.ieltsgrader.com${page.path}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'IELTS AI Tutor by IELTSGRADER',
      url: 'https://www.ieltsgrader.com',
    },
  };

  const howToLd = page.showCalculator
    ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to calculate your IELTS Writing band score',
        description:
          'Combine Task 1 and Task 2 bands with Task 2 weighted twice, then round to the nearest half band.',
        step: [
          {
            '@type': 'HowToStep',
            name: 'Enter Task 1 and Task 2 bands',
            text: 'Use your practice or estimated task bands from 0 to 9 in half-band steps.',
          },
          {
            '@type': 'HowToStep',
            name: 'Apply the 1:2 weighting',
            text: 'Calculate (Task 1 + 2 × Task 2) ÷ 3.',
          },
          {
            '@type': 'HowToStep',
            name: 'Round to the nearest half band',
            text: 'Report the result as a whole or half band for practice planning.',
          },
        ],
      }
    : null;

  const jsonLd = [webPageLd, faqLd, howToLd].filter(Boolean);

  return (
    <SeoLayout
      wide
      breadcrumbs={[{ href: '/', label: 'Home' }, { href: page.path, label: page.shortTitle || page.h1 }]}
      hero={{
        eyebrow: 'IELTS AI Tutor by IELTSGRADER',
        title: page.h1,
        subtitle: page.intro,
        actions: (
          <>
            <SeoPrimaryButton to={page.cta.href}>{page.cta.label}</SeoPrimaryButton>
            {page.secondaryCta && (
              <SeoSecondaryButton to={page.secondaryCta.href}>
                {page.secondaryCta.label}
              </SeoSecondaryButton>
            )}
          </>
        ),
      }}
    >
      <SeoHead title={page.title} description={page.description} path={page.path} jsonLd={jsonLd} />

      <div className="max-w-4xl">
        {page.highlights?.length > 0 && (
          <SeoFeatureGrid items={page.highlights} />
        )}

        {page.showCalculator && <BandScoreCalculator />}

        {page.sections.map((section) => (
          <section key={section.heading} className="mb-10">
            <h2 className="text-[26px] md:text-[30px] font-extrabold text-[#1a1f36] mb-4 tracking-tight font-['Nunito',_sans-serif]">
              {section.heading}
            </h2>
            {section.body && (
              <p className="text-[16px] text-[#374151] leading-relaxed mb-4">{section.body}</p>
            )}
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 40)} className="text-[16px] text-[#374151] leading-relaxed mb-4">
                {p}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc pl-5 space-y-2 text-[15px] text-[#374151] leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {page.steps?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[26px] md:text-[30px] font-extrabold text-[#1a1f36] mb-6 tracking-tight font-['Nunito',_sans-serif]">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {page.steps.map((step, i) => (
                <div key={step.title} className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <div className="w-8 h-8 rounded-full bg-[#1a1f36] text-white text-sm font-bold flex items-center justify-center mb-3">
                    {i + 1}
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1a1f36] mb-2">{step.title}</h3>
                  <p className="text-[14px] text-[#6B7280] leading-relaxed m-0">{step.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <SeoFaq items={page.faqs || []} />
        <SeoCta label={page.cta.label} href={page.cta.href} />

        {page.links?.length > 0 && (
          <section className="mt-10 pt-8 border-t border-[#E5E7EB]">
            <h2 className="text-[20px] font-bold text-[#1a1f36] mb-4">Related resources</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {page.links.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="block rounded-[12px] border border-[#E5E7EB] px-4 py-3 text-[#3B82F6] font-medium no-underline hover:border-[#BFDBFE] transition-colors"
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </SeoLayout>
  );
}
