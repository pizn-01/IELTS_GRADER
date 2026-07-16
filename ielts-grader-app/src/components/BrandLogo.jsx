import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Brand mark: logo icon + IELTSGRADER wordmark.
 * Use in headers so marketing, auth, and app shells stay consistent.
 */
const BrandLogo = ({
  to = '/',
  className = '',
  textClassName = 'text-[17px] md:text-[19px] font-extrabold text-[#1a1f36] uppercase tracking-tight',
  imgClassName = 'h-[14px] md:h-[16px] w-auto',
  onClick,
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 shrink-0 no-underline hover:opacity-80 transition-opacity cursor-pointer ${className}`}
  >
    <img
      src="/brand-logo.png"
      alt=""
      className={`${imgClassName} object-contain object-left block`}
      decoding="async"
    />
    <span className={textClassName} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>
      IELTSGRADER
    </span>
  </Link>
);

export default BrandLogo;
