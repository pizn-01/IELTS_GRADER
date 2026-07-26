import { Link } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Clock,
  FileText,
  Layers,
  LineChart,
  Sparkles,
  Target,
  FileCheck2,
  Wand2,
} from 'lucide-react';
import SeoLayout from '../seo/SeoLayout';
import SeoHead from '../seo/SeoHead';
import { SeoCta, SeoFaq, SeoPrimaryButton, SeoSecondaryButton } from '../seo/SeoBlocks';

const FEATURE_GROUPS = [
  {
    title: 'AI writing evaluation',
    description: 'Paste, upload, or type your essay and get a full tutor-style report in about a minute.',
    items: [
      {
        icon: FileCheck2,
        title: 'Paste or upload essays',
        body: 'PDF, Word, images, or typed text, including handwritten essays via OCR.',
      },
      {
        icon: Target,
        title: 'Four-criterion band scores',
        body: 'Task Response/Achievement, Coherence, Lexical Resource, and Grammar, scored separately.',
      },
      {
        icon: Wand2,
        title: 'Sentence fix cards',
        body: 'See the problem, a rewritten sentence, and why it costs marks, not a vague summary.',
      },
      {
        icon: FileText,
        title: 'Model answers',
        body: 'A stronger Band 8+ style response for the same prompt so you can compare structure and language.',
      },
    ],
  },
  {
    title: 'Practice like exam day',
    description: 'Build stamina with timed mocks and the same report quality afterward.',
    items: [
      {
        icon: Clock,
        title: 'Mock writing exams',
        body: 'Computer-based timer, Academic or General Training, Task 1 and Task 2.',
      },
      {
        icon: Layers,
        title: 'All task types',
        body: 'Academic charts/maps, GT letters, and Task 2 essays, one workflow for every prompt.',
      },
      {
        icon: Sparkles,
        title: 'Dual-AI grading',
        body: 'Independent model checks reduce one-sided scoring and surface clearer feedback.',
      },
      {
        icon: BarChart3,
        title: 'Progress tracking',
        body: 'Compare submissions over time and spot which criterion is still capping your band.',
      },
    ],
  },
  {
    title: 'Study plans that stick',
    description: 'Turn each report into focused practice instead of rewriting whole essays at random.',
    items: [
      {
        icon: BookOpen,
        title: 'Personalized learning editions',
        body: 'Guides built from your recurring mistakes, grammar, vocabulary, and structure.',
      },
      {
        icon: LineChart,
        title: '14-day improvement sprints',
        body: 'Short plans that prioritize the weakest criterion after a mock or upload.',
      },
      {
        icon: Target,
        title: 'Target band tracking',
        body: 'Set your goal and see how each practice session moves you closer.',
      },
      {
        icon: FileText,
        title: 'Error taxonomy',
        body: 'Group mistakes by type so you fix patterns, not one-off typos.',
      },
    ],
  },
];

const FAQS = [
  {
    q: 'Are evaluations free?',
    a: 'Yes. New accounts get three full evaluations with band scores and fix cards, no credit card required.',
  },
  {
    q: 'Does this replace a human tutor?',
    a: 'It is built for high-frequency practice between lessons. You get criterion-level feedback in ~60 seconds so you can submit often and improve faster.',
  },
  {
    q: 'Academic and General Training?',
    a: 'Both. Task 1 reports, GT letters, and Task 2 essays are supported in upload and mock modes.',
  },
  {
    q: 'Will my score match the official IELTS exam?',
    a: 'Feedback is aligned with public band descriptors for practice. It is not an official IELTS result and cannot guarantee your test-day score.',
  },
];

export default function FeaturesPage() {
  return (
    <SeoLayout
      wide
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { href: '/features', label: 'Features' },
      ]}
      hero={{
        eyebrow: 'Product features',
        title: 'Everything in IELTS AI Tutor: from score to study plan',
        subtitle:
          'Band scores, fix cards, mock exams, and personalized learning in one place. Built for students aiming for Band 7+.',
        actions: (
          <>
            <SeoPrimaryButton to="/signup">Start free</SeoPrimaryButton>
            <SeoSecondaryButton to="/sample-report">See sample report</SeoSecondaryButton>
          </>
        ),
      }}
    >
      <SeoHead
        title="IELTS AI Tutor Features: Reports, Fix Cards & Mock Exams | IELTSGRADER"
        description="Explore IELTSGRADER features: criterion band scores, sentence fix cards, mock writing tests, dual-AI grading, and personalized study plans."
        path="/features"
      />

      <div className="max-w-5xl">
        <div className="rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] p-3 md:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] mb-14 overflow-hidden">
          <img
            src="/images/features-cards.png"
            alt="IELTSGRADER feature cards showing writing feedback and improvements"
            className="w-full h-auto rounded-[12px] object-contain"
          />
        </div>

        {FEATURE_GROUPS.map((group) => (
          <section key={group.title} className="mb-14">
            <h2 className="text-[26px] md:text-[30px] font-extrabold text-[#1a1f36] mb-2 tracking-tight font-['Nunito',_sans-serif]">
              {group.title}
            </h2>
            <p className="text-[16px] text-[#6B7280] leading-relaxed mb-8 max-w-2xl">
              {group.description}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[16px] border border-[#E5E7EB] bg-white p-5 hover:border-[#BFDBFE] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-[#3B82F6]" strokeWidth={2} />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#1a1f36] mb-2">{item.title}</h3>
                    <p className="text-[14px] text-[#6B7280] leading-relaxed m-0">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mb-10 rounded-[20px] border border-[#E5E7EB] bg-[#1A96F30D] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-[22px] md:text-[24px] font-extrabold text-[#1a1f36] mb-2 font-['Nunito',_sans-serif]">
              Prefer to see the report first?
            </h2>
            <p className="text-[15px] text-[#6B7280] m-0 max-w-xl">
              Browse annotated previews of a real report layout before you submit your own essay.
            </p>
          </div>
          <Link
            to="/sample-report"
            className="inline-flex items-center justify-center bg-[#1a1f36] text-white px-6 py-3 rounded-[10px] text-[14px] font-bold no-underline hover:bg-[#2a2f46] transition-colors shrink-0"
          >
            See sample report
          </Link>
        </section>

        <SeoFaq items={FAQS} />

        <SeoCta
          title="Try every feature free"
          subtitle="One full evaluation included, band scores, fix cards, and your first improvement plan."
          label="Create free account"
          href="/signup"
        />
      </div>
    </SeoLayout>
  );
}
