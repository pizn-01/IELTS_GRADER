import React, { useState } from 'react';

const FAQ = () => {
  const [activeFaq, setActiveFaq] = useState(0); // First one open by default

  const faqs = [
    {
      q: 'Can I upload handwritten essays?',
      a: 'Yes, our OCR technology reads handwriting instantly. Simply take a clear photo of your handwritten essay and upload it in JPG or PNG format.'
    },
    {
      q: 'Do I really get a free report?',
      a: 'Yes! Every user gets one full evaluation report completely free. This includes your band score, detailed feedback, and fix cards.'
    },
    {
      q: 'How accurate is the AI?',
      a: "Our AI is trained on over 500,000 graded IELTS essays and has a 98% correlation with official examiner scores. It's the most accurate tool on the market."
    }
  ];

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <section id="faqs" className="bg-white py-20">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-[36px] font-bold text-[#1a1f36] mb-3 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-[16px] text-[#6B7280]">Everything you need to know before you upload.</p>
        </div>
        <div className="max-w-[760px] mx-auto">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-[#E5E7EB] rounded-[8px] mb-3 overflow-hidden transition-all"
            >
              <div
                className="py-[18px] px-5 flex justify-between items-center cursor-pointer"
                onClick={() => toggleFaq(i)}
              >
                <span className="text-[15px] font-medium text-[#1a1f36]">{faq.q}</span>
                <span className="text-[#6B7280] text-[20px] font-light leading-none select-none">
                  {activeFaq === i ? '−' : '+'}
                </span>
              </div>
              <div className={`px-5 transition-all duration-400 ease-in-out ${activeFaq === i ? 'pb-4 max-h-[200px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <p className="text-[14px] text-[#6B7280] leading-[1.6]">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
