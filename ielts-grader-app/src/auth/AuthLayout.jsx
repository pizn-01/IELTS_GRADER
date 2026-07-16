import React from 'react';
import BrandLogo from '../components/BrandLogo';

const AuthLayout = ({ children, noBox }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white font-['Plus_Jakarta_Sans',_sans-serif]">
      {/* Global styles for fine-tuning */}
      <style dangerouslySetInnerHTML={{ __html: `
        input {
          appearance: none;
          -webkit-appearance: none;
          border-radius: 8px;
        }
        input::placeholder {
          color: #9CA3AF !important;
          opacity: 1;
        }
        input:focus {
          border: 1.5px solid #3B82F6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
        }
        .btn-primary-active:hover {
          background-color: #374555 !important;
        }
        .btn-google:hover {
          background-color: #F9FAFB !important;
        }
        a:hover {
          opacity: 0.8;
        }
      ` }} />

      {/* Navbar */}
      <nav className="h-[56px] bg-white border-b border-[#E5E7EB] px-4 sm:px-10 flex justify-between items-center sticky top-0 z-[100]">
        <BrandLogo
          textClassName="text-[16px] font-bold text-[#1a1f36] uppercase tracking-[-0.02em]"
          imgClassName="h-7 w-7"
        />
        <a href="#" className="text-[14px] font-normal text-[#374151] no-underline">
          Need Help?
        </a>
      </nav>

      {/* Main Content */}
      <main className={`flex justify-center bg-white ${noBox ? 'flex-col items-center py-10 sm:py-16 px-4 sm:px-5' : 'flex-1 items-center py-10 sm:py-16 px-4 sm:px-5'}`}>
        <div className={`w-full bg-white ${
          noBox
            ? 'max-w-[520px]'
            : 'max-w-[480px] p-6 sm:p-12 rounded-[16px] sm:rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03),0_10px_40px_rgba(0,0,0,0.04)] border border-[#E5E7EB]'
        }`}>
          {children}
        </div>

        {/* Footer inline for noBox pages — appears naturally below content */}
        {noBox && (
          <p className="mt-8 text-[13px] text-[#374151] text-center">
            Copyright @IELTSGRADER 2026 |{' '}
            <a href="#" className="text-[#374151] no-underline hover:opacity-80">Privacy Policy</a>
          </p>
        )}
      </main>

      {/* Footer for card-mode pages */}
      {!noBox && (
        <footer className="p-5 text-center text-[13px] text-[#374151]">
          Copyright @IELTSGRADER 2026 | <a href="#" className="text-[#374151] no-underline">Privacy Policy</a>
        </footer>
      )}
    </div>
  );
};

export default AuthLayout;
