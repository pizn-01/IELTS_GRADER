import React from 'react';

const CTA = () => {
  return (
    <section className="bg-white pt-[80px] pb-24">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-[80px] lg:px-[242px]">
        <div className="bg-[#F8FAFC] rounded-[32px] p-10 md:p-16 flex flex-col md:flex-row justify-between items-center gap-12 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] border border-[#F1F5F9]">
          <div className="max-w-[550px]">
            <h2 className="text-[32px] lg:text-[38px] font-bold text-[#1a1f36] leading-[1.25] mb-8 font-['Nunito',_sans-serif]">
              Join over <span className="text-[#3B82F6]">10,000</span> students already using IELTSGRADER to prepare for their exams.
            </h2>
            <a
              href="/#about"
              className="inline-block bg-[#1a1f36] text-white px-8 py-4 rounded-[12px] text-[16px] font-bold no-underline hover:bg-[#2a2f46] transition-all shadow-md active:scale-[0.98]"
            >
              Get started — it's free!
            </a>
          </div>

          <div className="relative group flex justify-center items-center md:-ml-[120px]">
            <div className="absolute -inset-10 bg-blue-100/40 rounded-full blur-3xl group-hover:bg-blue-100/60 transition-all"></div>
            <img
              src="/images/SVG - Call to action banner image.svg"
              alt="IELTSGRADER illustration"
              className="w-full max-w-[320px] md:max-w-[400px] relative drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
