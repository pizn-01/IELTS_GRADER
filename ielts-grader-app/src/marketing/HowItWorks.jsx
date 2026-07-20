import React from 'react';

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-white py-12 lg:py-20 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-[80px] lg:px-[242px]">
        {/* Header */}
        <div className="text-center mb-10 lg:mb-[60px]">
          <h2 className="text-[28px] lg:text-[32px] font-bold text-[#1a1f36] mb-3">How It Works</h2>
          <p className="text-[15px] text-[#9CA3AF]">
            Get your detailed IELTS tutor report in three steps: 1 free evaluation with signup, no card required.
          </p>
        </div>

        <div className="relative max-w-[1100px] mx-auto">
          {/* ===== STEP 1: Text LEFT | Mockup RIGHT ===== */}
          <div className="flex flex-col md:flex-row items-center gap-[8%] mb-[82px] relative">
            <div className="w-full md:w-[42%]">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative z-10 w-[35px] h-[35px] bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[15px] font-bold shrink-0">1</span>
                <h3 className="text-[24px] font-bold text-[#1a1f36]">Evaluate Your IELTS Writing Skills</h3>
              </div>
              <p className="text-[17px] text-[#6B7280] leading-relaxed">
                Paste or upload your essay, or practice in a real IELTS-style mock exam to get instant evaluation and improve your writing performance.
              </p>
            </div>
 
            <div className="w-full md:w-[50%] flex justify-center md:justify-end md:pr-4 lg:pr-8">
              <div className="relative w-full max-w-[280px] mr-0 md:mr-4">
                {/* Portrait screen recording — fill frame, hide YouTube chrome/link */}
                <div className="relative z-10 w-full aspect-[9/16] rounded-xl overflow-hidden shadow-lg bg-black">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/YevrdNf2wgk?autoplay=1&mute=1&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&disablekb=1&playsinline=1&loop=1&playlist=YevrdNf2wgk"
                    title="How IELTS Grader works"
                    className="absolute left-1/2 top-1/2 h-[115%] w-[115%] max-w-none -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
 
                {/* Connector SVG to Step 2 */}
                <div className="absolute top-[70%] right-[55%] w-[650px] h-[418px] hidden lg:block pointer-events-none z-0">
                  <svg width="650" height="418" viewBox="0 0 590.91 380.01" fill="none">
                    <path d="M 570 10 C 570 420, 20 -40, 20 370" className="connector-line" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ===== STEP 2: Mockup LEFT | Text RIGHT ===== */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-[8%] mb-[82px] relative">
            <div className="w-full md:w-[42%]">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative z-10 w-[35px] h-[35px] bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[15px] font-bold shrink-0">2</span>
                <h3 className="text-[22px] font-bold text-[#1a1f36]">Deep Evaluation</h3>
              </div>
              <p className="text-[15px] text-[#6B7280] leading-relaxed">
                Our Dual-AI Engine evaluates your Task Response, Coherence, Lexical Resource, and Grammar.
              </p>
            </div>
 
            <div className="w-full md:w-[50%] flex justify-center">
              <div className="relative">
                {/* Step 2 Card Image */}
                <div className="relative z-10 w-full max-w-[528px]">
                  <img src="/images/how-it-works/Background+Border+Shadow-1.png" alt="AI Grading" className="w-full h-auto" />
                </div>
 
                {/* Connector SVG to Step 3 */}
                <div className="absolute top-[70%] left-[55%] w-[650px] h-[418px] hidden lg:block pointer-events-none z-0">
                  <svg width="650" height="418" viewBox="0 0 590.91 380.01" fill="none">
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
                <span className="relative z-10 w-[35px] h-[35px] bg-[#1a1f36] text-white rounded-full flex items-center justify-center text-[15px] font-bold shrink-0">3</span>
                <h3 className="text-[22px] font-bold text-[#1a1f36]">Get Your Full Report</h3>
              </div>
              <p className="text-[15px] text-[#6B7280] leading-relaxed">
                Get a detailed Band Score, comprehensive report and interactive dashboard in 60 seconds.
              </p>
            </div>

            <div className="w-full md:w-[50%] flex justify-center">
              {/* Step 3 Card Image */}
              <div className="relative z-10 w-full max-w-[528px]">
                <img src="/images/how-it-works/Background+Border+Shadow-2.png" alt="IELTS Report Dashboard" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
