import React from 'react';
import { Upload, Clock, Info, Check } from 'lucide-react';

const HowItWorks = () => {
  const [selectedOption, setSelectedOption] = React.useState(null);
  const [activeTooltip, setActiveTooltip] = React.useState(null);

  const tooltips = {
    essay: { text: "Upload both your IELTS question prompt and your written answer for accurate evaluation." },
    mock: { text: "Practice under exam conditions to simulate a real computer-based IELTS environment." }
  };

  const Tooltip = ({ text }) => (
    <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[220px] bg-[#1a1f36] rounded-lg p-3 shadow-2xl z-[100] text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      <p className="m-0 text-[11px] leading-relaxed font-normal text-white opacity-95">{text}</p>
      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 rotate-45 w-[8px] h-[8px] bg-[#1a1f36]"></div>
    </div>
  );

  return (
    <section id="how-it-works" className="bg-white py-20 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Header */}
        <div className="text-center mb-[60px]">
          <h2 className="text-[32px] font-bold text-[#1a1f36] mb-3">How It Works</h2>
          <p className="text-[15px] text-[#9CA3AF]">
            Get your detailed IELTS report in three simple steps — no sign-up required to start.
          </p>
        </div>

        <div className="relative max-w-[1000px] mx-auto">
          {/* ===== STEP 1: Text LEFT | Mockup RIGHT ===== */}
          <div className="flex flex-col md:flex-row items-center gap-[8%] mb-32 relative">
            <div className="w-full md:w-[42%]">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative z-10 w-8 h-8 bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[14px] font-bold shrink-0">1</span>
                <h3 className="text-[22px] font-bold text-[#1a1f36]">Evaluate Your Writing Skills</h3>
              </div>
              <p className="text-[15px] text-[#6B7280] leading-relaxed">
                Upload your essay or practice in a real IELTS-style mock exam to get instant evaluation and improve your writing performance.
              </p>
            </div>
 
            <div className="w-full md:w-[50%] flex justify-center">
              <div className="relative">
                {/* Step 1 Card Image */}
                <div className="relative z-10 w-full max-w-[480px]">
                  <img src="/images/how-it-works/step1.png" alt="Evaluate Writing Skills" className="w-full h-auto" />
                </div>
 
                {/* Connector SVG to Step 2 */}
                <div className="absolute top-[70%] right-[55%] w-[590.91px] h-[380.01px] hidden lg:block pointer-events-none z-0">
                  <svg width="590.91" height="380.01" viewBox="0 0 590.91 380.01" fill="none">
                    <path d="M 570 10 C 570 420, 20 -40, 20 370" className="connector-line" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ===== STEP 2: Mockup LEFT | Text RIGHT ===== */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-[8%] mb-32 relative">
            <div className="w-full md:w-[42%]">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative z-10 w-8 h-8 bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[14px] font-bold shrink-0">2</span>
                <h3 className="text-[20px] font-bold text-[#1a1f36]">Deep Evaluation</h3>
              </div>
              <p className="text-[14px] text-[#6B7280] leading-relaxed">
                Our Dual-AI Engine evaluates your Task Response, Coherence, Lexical Resource, and Grammar.
              </p>
            </div>
 
            <div className="w-full md:w-[50%] flex justify-center">
              <div className="relative">
                {/* Step 2 Card Image */}
                <div className="relative z-10 w-full max-w-[480px]">
                  <img src="/images/how-it-works/step2.png" alt="AI Grading" className="w-full h-auto" />
                </div>
 
                {/* Connector SVG to Step 3 */}
                <div className="absolute top-[70%] left-[55%] w-[590.91px] h-[380.01px] hidden lg:block pointer-events-none z-0">
                  <svg width="590.91" height="380.01" viewBox="0 0 590.91 380.01" fill="none">
                    <path d="M 20 10 C 20 420, 570 -40, 570 370" className="connector-line" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ===== STEP 3: Text LEFT | Mockup RIGHT ===== */}
          <div className="flex flex-col md:flex-row items-center gap-[8%] relative">
            <div className="w-full md:w-[42%]">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative z-10 w-8 h-8 bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[14px] font-bold shrink-0">3</span>
                <h3 className="text-[20px] font-bold text-[#1a1f36]">Get Your Full Report</h3>
              </div>
              <p className="text-[14px] text-[#6B7280] leading-relaxed">
                Get a detailed Band Score, comprehensive report and interactive dashboard in 60 seconds.
              </p>
            </div>

            <div className="w-full md:w-[50%] flex justify-center">
              {/* Step 3 Card Image */}
              <div className="relative z-10 w-full max-w-[480px]">
                <img src="/images/how-it-works/step3.png" alt="IELTS Report Dashboard" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
