import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { user } = useAuth();
  const pricingHref = user
    ? '/upgrade?plan=monthly&from=upgrade'
    : '/pricing';

  const primaryLinks = [
    { label: 'Blog', href: '/blog' },
    { label: 'Essay checker', href: '/ielts-essay-checker' },
    { label: 'Pricing', href: pricingHref },
    { label: 'FAQ', href: '/#faqs' },
    { label: 'Support', href: '/settings?tab=Support' },
  ];
  const legalLinks = [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'Methodology', href: '/methodology' },
  ];

  return (
    <footer id="contact" className="bg-[#EAECF080] border-t border-[#E5E7EB] py-10 md:py-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-[50px]">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-12">
          <div className="max-w-sm">
            <Link to="/" className="text-[16px] font-extrabold text-[#1a1f36] uppercase tracking-tight no-underline">
              IELTSGRADER
            </Link>
            <p className="mt-3 text-[13px] text-[#6B7280] leading-relaxed">
              IELTS AI Tutor by IELTSGRADER: your assistant toward your target band—reports, progress tracking, and a personalized study plan.
            </p>
            <p className="mt-4 text-[12px] text-[#9CA3AF]">
              © 2026 IELTSGRADER. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap gap-10 md:gap-16">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-3">Resources</p>
              <div className="flex flex-col gap-2.5">
                {primaryLinks.map((link) => (
                  <a key={link.label} href={link.href} className="text-[13px] text-[#6B7280] no-underline hover:text-[#1a1f36] transition-colors">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-3">Legal</p>
              <div className="flex flex-col gap-2.5">
                {legalLinks.map((link) => (
                  <a key={link.label} href={link.href} className="text-[13px] text-[#6B7280] no-underline hover:text-[#1a1f36] transition-colors">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-3">Tools</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'AI Tutor', href: '/ielts-ai-tutor' },
                  { label: 'Task 1 checker', href: '/ielts-task-1-checker' },
                  { label: 'Task 2 checker', href: '/ielts-task-2-checker' },
                  { label: 'Mock writing test', href: '/ielts-mock-writing-test' },
                ].map((link) => (
                  <a key={link.label} href={link.href} className="text-[13px] text-[#6B7280] no-underline hover:text-[#1a1f36] transition-colors">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4">
          <p className="text-[12px] text-[#9CA3AF]">Not affiliated with IELTS, British Council, IDP, or Cambridge.</p>
          <div className="flex gap-4 items-center">
            <a href="#" aria-label="X" className="text-[#000000] hover:opacity-70 transition-all duration-200">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
              </svg>
            </a>
            <a href="#" aria-label="Instagram" className="text-[#E4405F] hover:opacity-70 transition-all duration-200">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="#" aria-label="YouTube" className="text-[#FF0000] hover:opacity-70 transition-all duration-200">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn" className="text-[#0077B5] hover:opacity-70 transition-all duration-200">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
