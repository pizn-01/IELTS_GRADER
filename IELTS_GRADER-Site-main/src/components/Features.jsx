import React from 'react';
import { ArrowUp, LineChart } from 'lucide-react';

const Features = () => {
  return (
    <section id="sample-report" className="bg-[#1A96F30D] py-20">
      <div className="max-w-[1200px] mx-auto px-8 lg:px-[60px] grid lg:grid-cols-2 gap-[60px] items-start">
        {/* Left Column - Cards Image */}
        <div className="flex flex-col gap-5">
          <div className="relative z-10 w-full max-w-[600px]">
            <img src="/images/features-cards.png" alt="Report Cards" className="w-full h-auto" />
          </div>
        </div>

        {/* Right Column - Text & Checklist */}
        <div>
          <h2 className="text-[40px] font-bold text-[#1a1f36] leading-[1] tracking-normal mb-6 font-['Nunito',_sans-serif]">
            Stop guessing. See exactly where you lost points and how to rewrite your sentences to hit Band 7.5+.
          </h2>
          <ul className="flex flex-col gap-[14px] mb-8 list-none">
            {[
              'Band score for each IELTS criterion',
              'Sentence-by-sentence fix cards',
              'AI-rewritten improved sentences',
              'Vocabulary & grammar corrections',
              'Personalized improvement tips',
              'Progress tracking across submissions'
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[16px] font-bold text-[#374151] leading-6 tracking-normal font-['Nunito',_sans-serif]">
                <span className="w-[22px] h-[22px] bg-[#00C9A7] text-white rounded-full flex items-center justify-center text-[12px] shrink-0 font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-6">
            <a href="#" className="bg-[#1a1f36] text-[#FFFFFF] px-6 py-3.5 rounded-[10px] text-[16px] font-semibold no-underline hover:bg-[#2a2f46] transition-all leading-6 tracking-normal font-['Nunito',_sans-serif] shadow-sm">
              See Sample Report
            </a>
            <a href="#" className="text-[#101828] font-semibold no-underline text-[16px] hover:text-[#3B82F6] transition-all leading-6 tracking-normal font-['Nunito',_sans-serif] flex items-center gap-1">
              View All Features <span className="text-[#4B5563] ml-0.5">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
