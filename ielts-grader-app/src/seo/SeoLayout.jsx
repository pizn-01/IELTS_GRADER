import { Link } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';

export default function SeoLayout({ children, breadcrumbs = [] }) {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="text-sm text-[#6B7280] mb-6">
              <ol className="flex flex-wrap gap-1 items-center">
                {breadcrumbs.map((crumb, i) => (
                  <li key={crumb.href} className="flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {i === breadcrumbs.length - 1 ? (
                      <span className="text-[#1a1f36]">{crumb.label}</span>
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
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
