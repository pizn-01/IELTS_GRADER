import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';

export function SeoCta({
  label = 'Get your free band score',
  href = '/signup',
  title = 'Try IELTS AI Tutor free',
  subtitle = 'Get criterion-level feedback and a personalized study plan in about 60 seconds.',
}) {
  return (
    <section className="mt-14 mb-4">
      <div className="bg-[#F8FAFC] rounded-[24px] md:rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10 border border-[#F1F5F9] shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)]">
        <div className="max-w-[520px]">
          <h2 className="text-[26px] md:text-[32px] font-bold text-[#1a1f36] leading-[1.25] mb-3 font-['Nunito',_sans-serif]">
            {title}
          </h2>
          <p className="text-[#6B7280] text-[15px] md:text-[16px] mb-6 leading-relaxed">
            {subtitle}
          </p>
          <Link
            to={href}
            className="inline-block bg-[#1a1f36] text-white px-7 py-3.5 rounded-[12px] text-[15px] font-bold no-underline hover:bg-[#2a2f46] transition-all shadow-md active:scale-[0.98]"
          >
            {label}
          </Link>
        </div>
        <div className="relative group flex justify-center items-center shrink-0">
          <div className="absolute -inset-8 bg-blue-100/40 rounded-full blur-3xl group-hover:bg-blue-100/60 transition-all" />
          <img
            src="/images/SVG - Call to action banner image.svg"
            alt="IELTS AI Tutor illustration"
            className="w-full max-w-[220px] md:max-w-[280px] relative drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>
    </section>
  );
}

export function SeoFaq({ items = [] }) {
  const [active, setActive] = useState(0);
  if (!items.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-[28px] md:text-[32px] font-extrabold text-[#1a1f36] mb-6 tracking-tight font-['Nunito',_sans-serif]">
        Frequently asked questions
      </h2>
      <div className="space-y-3">
        {items.map((faq, i) => {
          const open = active === i;
          return (
            <div
              key={faq.q}
              className={`rounded-[16px] border transition-colors ${
                open ? 'border-[#BFDBFE] bg-[#F8FBFF]' : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => setActive(open ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-transparent border-none cursor-pointer"
              >
                <span className="text-[15px] md:text-[16px] font-semibold text-[#1a1f36]">
                  {faq.q}
                </span>
                <span className="text-[#3B82F6] shrink-0">
                  {open ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </span>
              </button>
              {open && (
                <div className="px-5 pb-5 text-[15px] text-[#6B7280] leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SeoFeatureGrid({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="grid sm:grid-cols-2 gap-4 my-8">
      {items.map((item) => (
        <div
          key={item.title || item}
          className="rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] p-5"
        >
          {item.title ? (
            <>
              <h3 className="text-[16px] font-bold text-[#1a1f36] mb-2">{item.title}</h3>
              <p className="text-[14px] text-[#6B7280] leading-relaxed m-0">{item.body}</p>
            </>
          ) : (
            <p className="text-[14px] text-[#374151] m-0 leading-relaxed">{item}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function SeoPrimaryButton({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center bg-[#1a1f36] text-white px-6 py-3 rounded-[10px] text-[14px] font-bold no-underline hover:bg-[#2a2f46] transition-colors"
    >
      {children}
    </Link>
  );
}

export function SeoSecondaryButton({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center bg-white text-[#1a1f36] px-6 py-3 rounded-[10px] text-[14px] font-bold no-underline border border-[#E5E7EB] hover:border-[#BFDBFE] hover:text-[#3B82F6] transition-colors"
    >
      {children}
    </Link>
  );
}
