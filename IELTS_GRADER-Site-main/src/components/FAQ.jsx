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
    <section id="faqs" className="bg-white py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-8">
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
              className={`border rounded-[16px] transition-all duration-300 overflow-hidden ${
                activeFaq === i 
                  ? 'border-[#3B82F6] bg-[#F8FAFF] shadow-[0_10px_30px_-10px_rgba(59,130,246,0.1)]' 
                  : 'border-[#E5E7EB] bg-white hover:border-[#3B82F6]/50'
              }`}
            >
              <div
                className="py-6 px-8 flex justify-between items-center cursor-pointer group"
                onClick={() => toggleFaq(i)}
              >
                <span className={`text-[16px] md:text-[18px] font-bold transition-colors ${
                  activeFaq === i ? 'text-[#3B82F6]' : 'text-[#1a1f36]'
                }`}>
                  {faq.q}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  activeFaq === i ? 'bg-[#3B82F6] text-white rotate-180' : 'bg-[#F3F4F6] text-[#9CA3AF] group-hover:bg-[#EFF6FF] group-hover:text-[#3B82F6]'
                }`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
              <div 
                className={`px-8 transition-all duration-400 ease-in-out ${
                  activeFaq === i ? 'pb-8 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="pt-2 border-t border-[#E5E7EB]/50">
                  <p className="text-[15px] md:text-[16px] text-[#4B5563] leading-[1.7] mt-4">
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
