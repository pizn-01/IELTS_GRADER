import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ReactLenis, useLenis } from '@studio-freight/react-lenis';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import Footer from './components/Footer';

// Auth Pages
import LoginPage1 from './auth-pages/LoginPage1.jsx';
import LoginPage2 from './auth-pages/LoginPage2.jsx';
import LoginPage3 from './auth-pages/LoginPage3.jsx';
import LoginPage4 from './auth-pages/LoginPage4.jsx';
import SignupPage5 from './auth-pages/SignupPage5.jsx';
import SignupPage6 from './auth-pages/SignupPage6.jsx';
import ForgotPasswordPage7 from './auth-pages/ForgotPasswordPage7.jsx';
import ForgotPasswordPage8 from './auth-pages/ForgotPasswordPage8.jsx';
import CheckEmailPage9 from './auth-pages/CheckEmailPage9.jsx';
import VerifyEmailPage10 from './auth-pages/VerifyEmailPage10.jsx';
import ResetPasswordPage11 from './auth-pages/ResetPasswordPage11.jsx';
import AccountVerifiedPage12 from './auth-pages/AccountVerifiedPage12.jsx';
import PasswordResetSuccessPage13 from './auth-pages/PasswordResetSuccessPage13.jsx';

import { GradeProvider } from './context/GradeContext';

// New Pages
import PricingPage from './pages/PricingPage';
import CheckoutPage from './pages/CheckoutPage';
import ReportPage from './pages/ReportPage';
import MockExamPage from './pages/MockExamPage';
import SelectionPage from './pages/SelectionPage';
import AnalysisReadyPage from './pages/AnalysisReadyPage';

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
  const lenis = useLenis();

  useEffect(() => {
    if (location.hash) {
      // Small delay to ensure content is rendered
      const timeout = setTimeout(() => {
        const targetId = location.hash;
        const element = document.querySelector(targetId);
        if (element) {
          lenis?.scrollTo(targetId, { 
            offset: -80,
            immediate: false,
            duration: 1.5
          });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [location.hash, lenis]);

  return (
    <GradeProvider>
      <ReactLenis root options={{ 
        duration: 1.2, 
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
      }}>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* New Functional Pages */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/mock-exam" element={<MockExamPage />} />
          <Route path="/selection" element={<SelectionPage />} />
          <Route path="/analysis-ready" element={<AnalysisReadyPage />} />

          {/* Auth Pages Demo Routes */}
          <Route path="/login" element={<LoginPage1 />} />
          <Route path="/login-filled" element={<LoginPage2 />} />
          <Route path="/login-focused" element={<LoginPage3 />} />
          <Route path="/login-error" element={<LoginPage4 />} />
          <Route path="/signup" element={<SignupPage5 />} />
          <Route path="/signup-filled" element={<SignupPage6 />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage7 />} />
          <Route path="/forgot-password-filled" element={<ForgotPasswordPage8 />} />
          <Route path="/check-email" element={<CheckEmailPage9 />} />
          <Route path="/verify-email" element={<VerifyEmailPage10 />} />
          <Route path="/reset-password" element={<ResetPasswordPage11 />} />
          <Route path="/account-verified" element={<AccountVerifiedPage12 />} />
          <Route path="/password-reset-success" element={<PasswordResetSuccessPage13 />} />
        </Routes>
      </ReactLenis>
    </GradeProvider>
  );
}

export default App;
