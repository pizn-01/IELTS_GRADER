import React from 'react';

const CTA = () => {
  return (
    <section className="bg-white py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="bg-[#F8FAFC] rounded-[32px] p-10 md:p-16 flex flex-col md:flex-row justify-between items-center gap-12 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] border border-[#F1F5F9]">
          {/* Left */}
          <div className="max-w-[550px]">
            <h2 className="text-[32px] lg:text-[38px] font-bold text-[#1a1f36] leading-[1.25] mb-8 font-['Nunito',_sans-serif]">
              Join over <span className="text-[#3B82F6]">1,000,000</span> students already using IELTSGRADER to prepare for their exams.
            </h2>
            <a
              href="#"
              className="inline-block bg-[#374151] text-white px-8 py-4 rounded-[12px] text-[16px] font-bold no-underline hover:bg-[#1a1f36] transition-all shadow-md active:scale-[0.98]"
            >
              Get started — it's free!
            </a>
          </div>

          {/* Right - Illustration */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-blue-100/30 rounded-full blur-2xl group-hover:bg-blue-100/50 transition-all"></div>
            <img
              src="/images/upload and mock/Clip path group.png"
              alt="IELTSGRADER illustration"
              className="w-[220px] md:w-[260px] relative drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
