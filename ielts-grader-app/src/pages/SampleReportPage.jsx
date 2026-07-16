import { Link } from 'react-router-dom';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import { SeoCta, SeoPrimaryButton, SeoSecondaryButton } from '../seo/SeoBlocks';

const REPORT_SHOTS = [
  {
    src: '/images/Group 1597890526.png',
    alt: 'IELTS writing report mockup showing band scores and fix cards',
    title: 'Full report at a glance',
    body: 'Overall band, four criterion scores, and sentence-level fix cards in one view — the same layout you get after every evaluation.',
  },
  {
    src: '/images/Overview.png',
    alt: 'Sample IELTS report overview with criterion breakdown',
    title: 'Criterion-level overview',
    body: 'See Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy scored separately so you know exactly what to fix first.',
  },
  {
    src: '/images/features-cards.png',
    alt: 'Sample fix cards and writing feedback cards from an IELTS report',
    title: 'Fix cards & rewrites',
    body: 'Each weak sentence becomes a card with the issue, a clearer rewrite, and why it matters for your band — not a vague comment at the end.',
  },
];

const HIGHLIGHTS = [
  'Band score for each official IELTS writing criterion',
  'Sentence-by-sentence fix cards with AI rewrites',
  'Vocabulary and grammar corrections in context',
  'Model answer for the same prompt',
  'Personalized tips tied to your weakest criterion',
  'Progress tracking across submissions',
];

export default function SampleReportPage() {
  return (
    <SeoLayout
      wide
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { href: '/sample-report', label: 'Sample Report' },
      ]}
      hero={{
        eyebrow: 'Sample report',
        title: 'See exactly what your IELTS writing report looks like',
        subtitle:
          'Stop guessing. Here is the same report design students get after uploading an essay — band scores, fix cards, and a clear path to Band 7.5+.',
        actions: (
          <>
            <SeoPrimaryButton to="/signup">Get your free report</SeoPrimaryButton>
            <SeoSecondaryButton to="/features">View all features</SeoSecondaryButton>
          </>
        ),
      }}
    >
      <SeoHead
        title="Sample IELTS Writing Report | IELTS AI Tutor by IELTSGRADER"
        description="Preview a real IELTSGRADER writing report: criterion band scores, sentence fix cards, vocabulary notes, and model answers — before you submit your own essay."
        path="/sample-report"
      />

      <div className="max-w-5xl">
        <section className="mb-14">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-[#1a1f36] mb-3 tracking-tight font-['Nunito',_sans-serif]">
            What you get in every report
          </h2>
          <p className="text-[16px] text-[#6B7280] leading-relaxed mb-8 max-w-2xl">
            Built to match how IELTS writing is scored — so practice feedback maps to the criteria examiners use.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 list-none p-0 m-0">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[15px] font-semibold text-[#374151] leading-snug"
              >
                <span className="mt-0.5 w-[22px] h-[22px] bg-[#3B82F6] text-white rounded-full flex items-center justify-center text-[12px] shrink-0 font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-16 mb-6">
          {REPORT_SHOTS.map((shot, i) => (
            <div
              key={shot.src}
              className={`flex flex-col gap-6 ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} lg:items-center lg:gap-12`}
            >
              <div className="lg:w-[58%]">
                <div className="rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden">
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    className="w-full h-auto rounded-[12px] object-contain object-top max-h-[640px]"
                  />
                </div>
              </div>
              <div className="lg:w-[42%]">
                <p className="text-sm font-bold text-[#3B82F6] tracking-wide uppercase mb-2">
                  Screenshot {i + 1}
                </p>
                <h3 className="text-[22px] md:text-[26px] font-extrabold text-[#1a1f36] mb-3 tracking-tight font-['Nunito',_sans-serif]">
                  {shot.title}
                </h3>
                <p className="text-[15px] md:text-[16px] text-[#6B7280] leading-relaxed m-0">
                  {shot.body}
                </p>
              </div>
            </div>
          ))}
        </section>

        <p className="text-[13px] text-[#9CA3AF] mb-4">
          Screenshots are illustrative samples of the IELTSGRADER report UI. Your live report reflects your own essay and scores.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <Link
            to="/features"
            className="text-[15px] font-semibold text-[#3B82F6] no-underline hover:underline"
          >
            Explore all product features →
          </Link>
        </div>

        <SeoCta
          title="Ready for your own report?"
          subtitle="Paste or upload an essay and get the same band breakdown and fix cards in about 60 seconds — first evaluation free."
          label="Start free evaluation"
          href="/signup"
        />
      </div>
    </SeoLayout>
  );
}
