import React from 'react';
import { ArrowUp, LineChart } from 'lucide-react';

const Features = () => {
  return (
    <section id="sample-report" className="bg-[#1A96F30D] py-[50px]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[100px] grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-[60px] items-center">
        {/* Left Column - Mockups Image */}
        <div className="relative z-10 w-full animate-fadeIn order-2 lg:order-1">
          <img src="/images/Group 1597890526.png" alt="IELTS Report Mockup" className="w-full h-auto drop-shadow-xl" />
        </div>

        {/* Right Column - Text & Checklist */}
        <div className="flex flex-col items-start text-left order-1 lg:order-2">
          <h2 className="text-[32px] md:text-[38px] font-bold text-[#1a1f36] leading-[1.2] tracking-tight mb-8 font-['Nunito',_sans-serif]">
            Stop guessing. See exactly where you lost points and how to rewrite your sentences to hit Band 7.5+.
          </h2>
          <ul className="flex flex-col gap-4 mb-10 list-none w-full">
            {[
              'Band score for each IELTS criterion',
              'Sentence-by-sentence fix cards',
              'AI-rewritten improved sentences',
              'Vocabulary & grammar corrections',
              'Personalized improvement tips',
              'Progress tracking across submissions'
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[16px] font-bold text-[#374151] leading-6 tracking-normal font-['Nunito',_sans-serif]">
                <span className="w-[22px] h-[22px] bg-[#3B82F6] text-white rounded-full flex items-center justify-center text-[12px] shrink-0 font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <a href="#" className="bg-[#1a1f36] text-[#FFFFFF] px-8 py-3.5 rounded-[12px] text-[16px] font-semibold no-underline hover:bg-[#2a2f46] transition-all leading-6 tracking-normal font-['Nunito',_sans-serif] shadow-md w-full sm:w-auto text-center">
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
