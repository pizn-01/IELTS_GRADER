import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <section id="faqs" className="bg-white pt-[80px] pb-24">
      <div className="max-w-[1440px] mx-auto px-[242px]">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[42px] font-extrabold text-[#1a1f36] mb-4 tracking-tight font-['Nunito',_sans-serif]">
            Frequently Asked Questions
          </h2>
          <p className="text-[17px] text-[#6B7280] max-w-[600px] mx-auto leading-relaxed">
            Everything you need to know before you upload.
          </p>
        </div>
        
        <div className="max-w-[800px] mx-auto space-y-4">
          {faqs.map((faq, i) => (
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
      </div>
    </section>
  );
};

export default FAQ;
