import { Link } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';

export default function SeoLayout({
  children,
  breadcrumbs = [],
  hero = null,
  wide = false,
}) {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">
        {hero && (
          <section className="bg-[#1A96F30D] border-b border-[#E5E7EB] pt-28 pb-12 md:pb-16">
            <div className="max-w-[1440px] mx-auto px-4 md:px-[50px] lg:px-[80px]">
              {breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb" className="text-sm text-[#6B7280] mb-5">
                  <ol className="flex flex-wrap gap-1.5 items-center">
                    {breadcrumbs.map((crumb, i) => (
                      <li key={crumb.href} className="flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden="true" className="text-[#D1D5DB]">/</span>}
                        {i === breadcrumbs.length - 1 ? (
                          <span className="text-[#1a1f36] font-medium">{crumb.label}</span>
                        ) : (
                          <Link to={crumb.href} className="hover:text-[#3B82F6] no-underline transition-colors">
                            {crumb.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              {hero.eyebrow && (
                <p className="text-sm font-bold text-[#3B82F6] tracking-wide uppercase mb-3">
                  {hero.eyebrow}
                </p>
              )}
              <h1 className="text-[32px] md:text-[42px] lg:text-[48px] font-extrabold text-[#1a1f36] tracking-tight leading-[1.15] font-['Nunito',_sans-serif] max-w-4xl">
                {hero.title}
              </h1>
              {hero.subtitle && (
                <p className="mt-4 text-[17px] md:text-[18px] text-[#6B7280] leading-relaxed max-w-2xl">
                  {hero.subtitle}
                </p>
              )}
              {hero.meta && (
                <p className="mt-3 text-sm text-[#9CA3AF]">{hero.meta}</p>
              )}
              {hero.actions && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {hero.actions}
                </div>
              )}
            </div>
          </section>
        )}

        <div className={`max-w-[1440px] mx-auto px-4 md:px-[50px] lg:px-[80px] ${hero ? 'py-12 md:py-16' : 'pt-28 pb-16'}`}>
          {!hero && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="text-sm text-[#6B7280] mb-6">
              <ol className="flex flex-wrap gap-1.5 items-center">
                {breadcrumbs.map((crumb, i) => (
                  <li key={crumb.href} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true" className="text-[#D1D5DB]">/</span>}
                    {i === breadcrumbs.length - 1 ? (
                      <span className="text-[#1a1f36] font-medium">{crumb.label}</span>
                    ) : (
                      <Link to={crumb.href} className="hover:text-[#3B82F6] no-underline">
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className={wide ? '' : 'max-w-3xl'}>
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
