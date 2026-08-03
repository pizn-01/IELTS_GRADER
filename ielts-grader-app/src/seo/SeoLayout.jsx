import { Link } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';

export default function SeoLayout({
  children,
  breadcrumbs = [],
  hero = null,
  wide = false,
  variant = 'default',
}) {
  const editorial = variant === 'editorial';

  const heroSectionClass = editorial
    ? 'blog-editorial-hero border-b border-[#E5E7EB] pt-28 pb-14 md:pb-20'
    : 'bg-[#1A96F30D] border-b border-[#E5E7EB] pt-28 pb-12 md:pb-16';

  const eyebrowClass = editorial
    ? 'text-[11px] md:text-xs font-bold text-[#3B82F6] tracking-[0.14em] uppercase mb-4'
    : 'text-sm font-bold text-[#3B82F6] tracking-wide uppercase mb-3';

  const titleClass = editorial
    ? "text-[34px] md:text-[44px] lg:text-[52px] font-extrabold text-[#1a1f36] tracking-[-0.03em] leading-[1.12] font-['Nunito',_sans-serif] max-w-4xl"
    : "text-[32px] md:text-[42px] lg:text-[48px] font-extrabold text-[#1a1f36] tracking-tight leading-[1.15] font-['Nunito',_sans-serif] max-w-4xl";

  const subtitleClass = editorial
    ? 'mt-5 text-[17px] md:text-[19px] text-[#4B5563] leading-relaxed max-w-2xl'
    : 'mt-4 text-[17px] md:text-[18px] text-[#6B7280] leading-relaxed max-w-2xl';

  return (
    <>
      <Navbar />
      <main className={`min-h-screen ${editorial ? 'bg-[#FAFBFC]' : 'bg-white'}`}>
        {hero && (
          <section className={heroSectionClass}>
            <div className="max-w-[1440px] mx-auto px-4 md:px-[50px] lg:px-[80px] relative z-[1]">
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
                <p className={eyebrowClass}>
                  {hero.eyebrow}
                </p>
              )}
              <h1 className={titleClass}>
                {hero.title}
              </h1>
              {editorial && <div className="blog-hero-accent mt-6" aria-hidden="true" />}
              {hero.subtitle && (
                <p className={subtitleClass}>
                  {hero.subtitle}
                </p>
              )}
              {hero.metaNodes ? (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {hero.metaNodes}
                </div>
              ) : hero.meta ? (
                <p className="mt-3 text-sm text-[#9CA3AF]">{hero.meta}</p>
              ) : null}
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
