import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';

// ── Context ──────────────────────────────────────────────────────────────────
import { GradeProvider } from './context/GradeContext';

// ── Route Guard ───────────────────────────────────────────────────────────────
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';

// ── Marketing Site Components ─────────────────────────────────────────────────
import Navbar from './marketing/Navbar';
import Hero from './marketing/Hero';
import HowItWorks from './marketing/HowItWorks';
import Features from './marketing/Features';
import Testimonials from './marketing/Testimonials';
import FAQ from './marketing/FAQ';
import CTA from './marketing/CTA';
import Footer from './marketing/Footer';

// ── Auth Pages ────────────────────────────────────────────────────────────────
import LoginPage from './auth/LoginPage1';
import SignupPage from './auth/SignupPage5';
import ForgotPasswordPage from './auth/ForgotPasswordPage7';
import CheckEmailPage from './auth/CheckEmailPage9';
import VerifyEmailPage from './auth/VerifyEmailPage10';
import ResetPasswordPage from './auth/ResetPasswordPage11';
import AccountVerifiedPage from './auth/AccountVerifiedPage12';
import PasswordResetSuccessPage from './auth/PasswordResetSuccessPage13';
import OAuthCallbackPage from './auth/OAuthCallbackPage';

// ── Public Functional Pages ───────────────────────────────────────────────────
import PricingPage from './pages/PricingPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';

// ── Protected Functional Pages ────────────────────────────────────────────────
import SelectionPage from './pages/SelectionPage';
import MockExamPage from './pages/MockExamPage';
import ReportPage from './pages/ReportPage';
import AnalysisReadyPage from './pages/AnalysisReadyPage';
import PerformanceOverviewPage from './pages/PerformanceOverviewPage';

// ── Dashboard ─────────────────────────────────────────────────────────────────
import DashboardApp from './dashboard/DashboardApp';
import Layout from './components/Layout';
import ReportsOverview from './components/ReportsOverview';
import Settings from './components/Settings';
import { useAuth } from './context/AuthContext';

// ── Landing Page Assembly ─────────────────────────────────────────────────────
const LandingPage = () => (
  <>
    <Navbar />
    <Hero />
    <div className="bg-white">
      <HowItWorks />
      <Features />
      <Testimonials />
      <FAQ />
    </div>
    <CTA />
    <Footer />
  </>
);

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();

  // Shared navigation handler for protected routes
  const handleProtectedNavigate = (target, label) => {
    if (target === 'dashboard') navigate('/dashboard');
    else if (target === 'reports') navigate('/reports');
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
      } catch { /* invalid selector — ignore */ }
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
    const isMarketingRoute = ['/', '/pricing', '/checkout', '/checkout/success'].includes(location.pathname);
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
      <Routes>
        {/* ── Landing Page ─────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />

        {/* ── Public Pages ──────────────────────────────────── */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

        {/* ── Auth Pages (public) ───────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/account-verified" element={<AccountVerifiedPage />} />
        <Route path="/password-reset-success" element={<PasswordResetSuccessPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* ── Protected Pages ───────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardApp /></ProtectedRoute>
        } />
        <Route path="/selection" element={<SelectionPage />} />
        <Route path="/mock-exam" element={<MockExamPage />} />
        <Route path="/report" element={
          <ProtectedRoute>
            <Layout 
              currentView="reports" 
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
          <ProtectedRoute>
            <Layout 
              currentView="reports" 
              onNavigate={handleProtectedNavigate} 
              profileImage={profileImage}
            >
              <ReportsOverview onBack={() => navigate('/dashboard')} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/performance" element={
          <ProtectedRoute>
            <Layout 
              currentView="reports" 
              onNavigate={handleProtectedNavigate} 
              profileImage={profileImage}
            >
              <PerformanceOverviewPage onBack={() => navigate('/reports')} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
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
    </GradeProvider>
  );
}

export default App;
