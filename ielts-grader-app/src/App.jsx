import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';

// ── Context ──────────────────────────────────────────────────────────────────
import { GradeProvider } from './context/GradeContext';

// ── Route Guard ───────────────────────────────────────────────────────────────
import { ProtectedRoute } from './components/ProtectedRoute';

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

// ── Public Functional Pages ───────────────────────────────────────────────────
import PricingPage from './pages/PricingPage';
import CheckoutPage from './pages/CheckoutPage';

// ── Protected Functional Pages ────────────────────────────────────────────────
import SelectionPage from './pages/SelectionPage';
import MockExamPage from './pages/MockExamPage';
import ReportPage from './pages/ReportPage';
import AnalysisReadyPage from './pages/AnalysisReadyPage';

// ── Dashboard ─────────────────────────────────────────────────────────────────
import DashboardApp from './dashboard/DashboardApp';

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

  // Smooth scroll for hash navigation on landing page
  useEffect(() => {
    if (!location.hash) return;
    const timeout = setTimeout(() => {
      const element = document.querySelector(location.hash);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [location.hash]);

  // Lenis smooth scroll for marketing pages
  useEffect(() => {
    // Only activate on landing page — dashboard manages its own lenis instance
    const isMarketingRoute = ['/', '/pricing', '/checkout'].includes(location.pathname);
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

        {/* ── Auth Pages (public) ───────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/account-verified" element={<AccountVerifiedPage />} />
        <Route path="/password-reset-success" element={<PasswordResetSuccessPage />} />

        {/* ── Protected Pages ───────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardApp /></ProtectedRoute>
        } />
        <Route path="/selection" element={
          <ProtectedRoute><SelectionPage /></ProtectedRoute>
        } />
        <Route path="/mock-exam" element={
          <ProtectedRoute><MockExamPage /></ProtectedRoute>
        } />
        <Route path="/report" element={
          <ProtectedRoute><ReportPage /></ProtectedRoute>
        } />
        <Route path="/analysis-ready" element={
          <ProtectedRoute><AnalysisReadyPage /></ProtectedRoute>
        } />
      </Routes>
    </GradeProvider>
  );
}

export default App;
