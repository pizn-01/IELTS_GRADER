import React, { useState } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';

const FAQ = () => {
  const [activeFaq, setActiveFaq] = useState(0); // First one open by default
  const [showAll, setShowAll] = useState(false);

  const faqs = [
    {
      q: 'Can I upload handwritten essays?',
      a: 'Yes, our OCR technology reads handwriting instantly. Simply take a clear photo of your handwritten essay and upload it in JPG or PNG format.'
    },
    {
      q: 'Do I really get a free report?',
      a: 'Yes! Every new account gets two free evaluation credits, so you can get a full band score and feedback report before deciding to upgrade.'
    },
    {
      q: 'How accurate is the AI?',
      a: "Every essay is graded by our Dual-AI Engine, a primary examiner model that scores your writing in detail, cross-checked by a second, independent model against official IELTS band descriptors. This keeps your band scores consistent and reliable, not just a single AI's guess."
    },
    {
      q: "What's the difference between Academic and General Training?",
      a: 'Both share the same Task 2 essay. For Task 1, Academic candidates describe or summarize a chart, graph, table, or diagram, while General Training candidates write a formal, semi-formal, or informal letter responding to a given situation. Just select the right task type when you upload, and our AI grades against the matching criteria.'
    },
    {
      q: 'Which writing tasks does the AI grade?',
      a: 'All three: IELTS Academic Task 1 (report/chart description), General Training Task 1 (letter writing), and Task 2 (the discursive essay shared by both test versions). Each task type is graded against its own official band descriptors.'
    },
    {
      q: 'What exactly is in my evaluation report?',
      a: 'Your report includes an overall band score plus individual bands for Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy, along with strengths, weaknesses, high-impact fixes, sentence-by-sentence error corrections, a Band 8+ model answer, and a full vocabulary and grammar breakdown.'
    },
    {
      q: 'How long does it take to get my results?',
      a: 'Most evaluations are ready in under 60 seconds. Paste or upload your essay (or finish a mock exam), and your full report (band scores, fix cards, and all) is generated automatically.'
    },
    {
      q: 'How do credits and pricing work?',
      a: 'Every account starts with 2 free evaluation credits. After that, you can choose a plan on our Pricing page, from a fixed number of evaluations per week to a larger monthly allowance, depending on how intensively you want to practice.'
    },
    {
      q: 'Can I practice under real exam conditions?',
      a: "Yes. Our Mock Exam mode simulates the real computer-based IELTS writing test, complete with timing, so you can build the speed and stamina you'll need on test day, not just get feedback on writing you already had time to polish."
    },
    {
      q: 'Is my writing and personal data kept private?',
      a: 'Yes. Your essays and reports are stored securely in your own account and are never shared with other users or used publicly. Only you (and, if applicable, your school administrator) can view your submissions and results.'
    }
  ];

  const visibleFaqs = showAll ? faqs : faqs.slice(0, 3);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleToggleShowAll = () => {
    if (showAll) {
      // Collapsing: if the open FAQ is about to be hidden, close it too
      if (activeFaq !== null && activeFaq >= 3) {
        setActiveFaq(null);
      }
    }
    setShowAll(!showAll);
  };

  return (
    <section id="faqs" className="bg-white pt-14 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-[80px] lg:px-[242px]">
        <div className="text-center mb-10">
          <h2 className="text-[32px] md:text-[42px] font-extrabold text-[#1a1f36] mb-4 tracking-tight font-['Nunito',_sans-serif]">
            Frequently Asked Questions
          </h2>
          <p className="text-[17px] text-[#6B7280] max-w-[600px] mx-auto leading-relaxed">
            Everything you need to know before you upload.
          </p>
        </div>
        
        <div className="max-w-[800px] mx-auto space-y-4">
          {visibleFaqs.map((faq, i) => (
            <div
              key={i}
              className={`border border-[#E5E7EB] rounded-[16px] transition-all duration-300 overflow-hidden ${
                activeFaq === i ? 'bg-white shadow-sm' : 'bg-white hover:border-gray-300'
              }`}
            >
              <div
                className="py-6 px-8 flex justify-between items-center cursor-pointer group"
                onClick={() => toggleFaq(i)}
              >
                <span className="text-[16px] md:text-[18px] font-bold text-[#1a1f36] transition-colors">
                  {faq.q}
                </span>
                <div className={`transition-all duration-300 ${
                  activeFaq === i ? 'rotate-180 text-[#1a1f36]' : 'text-[#9CA3AF] group-hover:text-[#1a1f36]'
                }`}>
                  <ChevronDown className="w-6 h-6" />
                </div>
              </div>
              <div 
                className={`px-8 transition-all duration-400 ease-in-out ${
                  activeFaq === i ? 'pb-8 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div>
                  <p className="text-[15px] md:text-[16px] text-[#4B5563] leading-[1.7]">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={handleToggleShowAll}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#E5E7EB] text-[15px] font-bold text-[#1a1f36] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all"
          >
            {showAll ? (
              <>
                <Minus className="w-4 h-4" />
                Show fewer questions
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Show {faqs.length - 3} more questions
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
