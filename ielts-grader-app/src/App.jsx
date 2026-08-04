import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Lenis from 'lenis';

// ── Context ──────────────────────────────────────────────────────────────────
import { GradeProvider } from './context/GradeContext';

// ── Route Guard ───────────────────────────────────────────────────────────────
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

// ── Marketing Site Components (eager — P0 CWV) ───────────────────────────────
import Navbar from './marketing/Navbar';
import Hero from './marketing/Hero';
import HowItWorks from './marketing/HowItWorks';
import Features from './marketing/Features';
import LatestFromBlog from './marketing/LatestFromBlog';
import Testimonials from './marketing/Testimonials';
import FAQ, { homeFaqs } from './marketing/FAQ';
import CTA from './marketing/CTA';
import Footer from './marketing/Footer';

// ── Public SEO / marketing pages (eager) ─────────────────────────────────────
import PricingPage from './pages/PricingPage';
import SampleReportPage from './pages/SampleReportPage';
import FeaturesPage from './pages/FeaturesPage';
import GradeEssayPage from './pages/GradeEssayPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import LegalPage from './pages/LegalPage';
import ToolLandingPage from './seo/ToolLandingPage';
import SeoHead from './seo/SeoHead';
import { toolPages } from './content/toolPagesData';

// ── Heavy app / auth routes (lazy — keep marketing JS lean) ───────────────────
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./auth/LoginPage1'));
const SignupPage = lazy(() => import('./auth/SignupPage5'));
const ForgotPasswordPage = lazy(() => import('./auth/ForgotPasswordPage7'));
const CheckEmailPage = lazy(() => import('./auth/CheckEmailPage9'));
const ResetPasswordPage = lazy(() => import('./auth/ResetPasswordPage11'));
const PasswordResetSuccessPage = lazy(() => import('./auth/PasswordResetSuccessPage13'));
const OAuthCallbackPage = lazy(() => import('./auth/OAuthCallbackPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const MockExamPage = lazy(() => import('./pages/MockExamPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const AnalysisReadyPage = lazy(() => import('./pages/AnalysisReadyPage'));
const PersonalizedLearningPage = lazy(() => import('./pages/PersonalizedLearningPage'));
const DashboardApp = lazy(() => import('./dashboard/DashboardApp'));
const Layout = lazy(() => import('./components/Layout'));
const Settings = lazy(() => import('./components/Settings'));

import { useAuth } from './context/AuthContext';
import { useVisitorTracking } from './hooks/useVisitorTracking';

const SEO_MARKETING_ROUTES = [
  '/',
  '/pricing',
  '/checkout',
  '/checkout/success',
  '/blog',
  '/terms',
  '/privacy',
  '/cookies',
  '/sample-report',
  '/features',
  '/grade-my-essay',
  ...toolPages.map((p) => p.path),
];

// ── Landing Page Assembly ─────────────────────────────────────────────────────
const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'IELTS AI Tutor by IELTSGRADER',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: 'https://www.ieltsgrader.com/',
    description:
      'AI writing tutor for IELTS that explains mistakes, tracks progress, and builds a personalized plan toward your target band.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free first evaluation',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homeFaqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.ieltsgrader.com/#organization',
        name: 'IELTSGRADER',
        url: 'https://www.ieltsgrader.com/',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.ieltsgrader.com/favicon-512x512.png',
          width: 512,
          height: 512,
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://www.ieltsgrader.com/#website',
        name: 'IELTSGRADER',
        alternateName: 'IELTS AI Tutor by IELTSGRADER',
        url: 'https://www.ieltsgrader.com/',
        publisher: { '@id': 'https://www.ieltsgrader.com/#organization' },
      },
    ],
  },
];

const LandingPage = () => (
  <>
    <SeoHead
      title="IELTS AI Tutor by IELTSGRADER: Free Essay Evaluation & Band Score"
      description="Grade your IELTS essay in about 60 seconds: band score, criterion feedback, fix cards, and a plan to your target band. Two free evaluations, no card needed."
      path="/"
      jsonLd={HOME_JSON_LD}
    />
    <Navbar />
    <Hero />
    <div className="bg-white">
      <HowItWorks />
      <Features />
      <LatestFromBlog />
      <Testimonials />
      <FAQ />
    </div>
    <CTA />
    <Footer />
  </>
);

// Legacy /reports and /performance URLs → Dashboard (Performance tabs live there)
const PerformanceRedirect = () => {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  // Preserve task; map legacy params into dashboard tab query when present
  const query = next.toString();
  return <Navigate to={query ? `/dashboard?${query}` : '/dashboard'} replace />;
};

/** Legacy /selection → public Pricing, preserving query (e.g. ?plan=monthly). */
const SelectionToPricingRedirect = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={query ? `/pricing?${query}` : '/pricing'} replace />;
};

// ── Home Route — redirects authenticated users to dashboard ───────────────────
const HomeRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();

  useVisitorTracking();

  // Shared navigation handler for protected routes
  const handleProtectedNavigate = (target, label) => {
    if (target === 'dashboard') navigate('/dashboard');
    else if (target === 'learning') navigate('/learning');
    else if (target === 'plans') navigate('/upgrade?plan=monthly&from=upgrade');
    else if (target === 'subscription') navigate('/subscription');
    else if (target === 'settings') navigate('/settings', { state: { activeTab: label } });
    else if (target === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const profileImage = user?.profile_image_url || null;
  const setProfileImage = (url) => updateUser({ profile_image_url: url });

  // Smooth scroll for hash navigation on landing page
  // Guard: skip OAuth/Supabase fragments like #access_token=... — not valid CSS selectors
  useEffect(() => {
    if (!location.hash) return;
    if (location.hash.includes('=') || location.hash.includes('&')) return;
    const timeout = setTimeout(() => {
      try {
        const element = document.querySelector(location.hash);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch { /* invalid selector, ignore */ }
    }, 100);
    return () => clearTimeout(timeout);
  }, [location.hash]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Lenis smooth scroll for marketing pages
  useEffect(() => {
    // Only activate on landing page — dashboard/protected pages manage their own lenis instance
    const isMarketingRoute = SEO_MARKETING_ROUTES.includes(location.pathname)
      || location.pathname.startsWith('/blog/')
      || toolPages.some((p) => p.path === location.pathname);
    if (!isMarketingRoute) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    const rafId = requestAnimationFrame(raf);
    return () => { lenis.destroy(); cancelAnimationFrame(rafId); };
  }, [location.pathname]);

  return (
    <GradeProvider>
      <Suspense fallback={<div className="min-h-screen bg-white" aria-hidden="true" />}>
      <Routes>
        {/* ── Landing Page ─────────────────────────────────── */}
        <Route path="/" element={<HomeRoute />} />

        {/* ── Public Pages ──────────────────────────────────── */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/sample-report" element={<SampleReportPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/grade-my-essay" element={<GradeEssayPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

        {/* ── SEO: tool landings, blog, legal (additive) ─── */}
        {toolPages.map((page) => (
          <Route key={page.slug} path={page.path} element={<ToolLandingPage page={page} />} />
        ))}
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/cookies" element={<LegalPage />} />

        <Route path="/upgrade" element={
          <ProtectedRoute>
            <Layout currentView="plans" onNavigate={handleProtectedNavigate} profileImage={profileImage}>
              <UpgradePage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ── Auth Pages (public) ───────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/password-reset-success" element={<PasswordResetSuccessPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* ── Protected Pages ───────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardApp /></ProtectedRoute>
        } />
        <Route path="/selection" element={<SelectionToPricingRedirect />} />
        <Route path="/mock-exam" element={<MockExamPage />} />
        <Route path="/report" element={
          <ProtectedRoute>
            <Layout 
              currentView="" 
              onNavigate={handleProtectedNavigate} 
              profileImage={profileImage}
            >
              <ReportPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/analysis-ready" element={
          <ProtectedRoute><AnalysisReadyPage /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute><PerformanceRedirect /></ProtectedRoute>
        } />
        <Route path="/performance" element={
          <ProtectedRoute><PerformanceRedirect /></ProtectedRoute>
        } />
        <Route path="/learning" element={
          <ProtectedRoute>
            <Layout
              currentView="learning"
              onNavigate={handleProtectedNavigate}
              profileImage={profileImage}
            >
              <PersonalizedLearningPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute>
            <Layout
              currentView="subscription"
              onNavigate={handleProtectedNavigate}
              profileImage={profileImage}
            >
              <SubscriptionPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout
              currentView="settings"
              onNavigate={handleProtectedNavigate}
              profileImage={profileImage}
            >
              <Settings
                profileImage={profileImage}
                setProfileImage={setProfileImage}
                currentUser={user}
              />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
      </Suspense>
    </GradeProvider>
  );
}

export default App;
