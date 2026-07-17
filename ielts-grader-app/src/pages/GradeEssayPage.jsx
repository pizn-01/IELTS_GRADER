import React from 'react';
import { Star, Zap, ShieldCheck } from 'lucide-react';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import SeoHead from '../seo/SeoHead';
import GradeEssayForm from '../components/GradeEssayForm';

const GradeEssayPage = () => (
  <>
    <SeoHead
      title="Grade My Essay: IELTS Writing Feedback in 60 Seconds | IELTSGRADER"
      description="Paste or upload your IELTS essay for criterion band scores, sentence-level fixes, and a clear improvement plan. 1 free evaluation. No card required."
      path="/grade-my-essay"
    />
    <Navbar />
    <main className="hero-mobile-wash min-h-[calc(100dvh-64px)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[60px] lg:px-[100px] py-8 lg:py-14">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-14">
          {/* Left copy */}
          <div className="w-full lg:w-[42%] flex flex-col justify-center">
            <div className="inline-flex items-center self-start px-3 py-1 bg-[#FEF9C3] border border-[#FDE68A] rounded-full text-[12px] font-medium text-[#78350F] mb-4">
              1 free evaluation · No card required
            </div>
            <h1 className="text-[28px] sm:text-[34px] lg:text-[40px] font-bold text-[#1a1f36] leading-[1.1] tracking-[-0.03em] mb-4 font-['Nunito',_sans-serif]">
              Grade your IELTS essay.<br />
              <span className="text-[#3B82F6]">Band scores & fixes</span> in 60 seconds.
            </h1>
            <p className="text-[15px] lg:text-[16px] text-[#6B7280] leading-relaxed mb-6 max-w-[480px]">
              Paste or upload your writing. We detect the task type, score all four criteria, and show sentence-level corrections you can act on.
            </p>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-[14px] lg:text-[15px] font-medium text-[#1a1f36]">
                <Star className="w-5 h-5 text-[#F59E0B] shrink-0" fill="#F59E0B" strokeWidth={2} />
                1 free full report, no credit card
              </div>
              <div className="flex items-center gap-3 text-[14px] lg:text-[15px] font-medium text-[#1a1f36]">
                <Zap className="w-5 h-5 text-[#2DD4BF] shrink-0" strokeWidth={2} />
                Criterion scores + sentence fixes, not just a band
              </div>
              <div className="flex items-center gap-3 text-[14px] lg:text-[15px] font-medium text-[#1a1f36]">
                <ShieldCheck className="w-5 h-5 text-[#2DD4BF] shrink-0" strokeWidth={2} />
                Personalized next steps toward your target band
              </div>
            </div>
          </div>

          {/* Right form card */}
          <div className="w-full lg:w-[58%] flex">
            <div className="bg-white/95 rounded-[18px] border border-[#E8ECF1] shadow-[0_12px_40px_rgba(26,31,54,0.06)] p-5 sm:p-7 lg:p-8 w-full flex flex-col">
              <GradeEssayForm variant="page" />
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default GradeEssayPage;
