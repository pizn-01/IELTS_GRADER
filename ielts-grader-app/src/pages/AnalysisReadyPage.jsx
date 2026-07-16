import React, { useState, useEffect, useRef } from 'react';
import { Check, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGrade } from '../context/GradeContext';
import { api } from '../services/api';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import AIProcessingModal from '../marketing/AIProcessingModal';
import { SUBSCRIPTION_FEATURES, planKeyFromSelection, SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import {
  peekPendingGradePayload,
  consumePendingGradePayload,
  markVerificationEmailSent,
  wasVerificationEmailSent,
} from '../utils/authStorage';

const AnalysisReadyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [trainingType, setTrainingType] = useState('Academic');
  const [selectedPlan, setSelectedPlan] = useState('Monthly');
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  const { gradingStatus, setGradingStatus, submissionId, setSubmissionId, essayData, updateEssayData } = useGrade();
  const pollRef = useRef(null);
  const hydratedRef = useRef(false);

  // Restore essay payload saved before login/signup (incl. Google OAuth)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const pending = peekPendingGradePayload();
    if (pending?.essayContent) {
      updateEssayData(pending);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set grading status once on mount only (Hero already sets it before navigating;
  // this is a safety net for direct URL access with credits)
  useEffect(() => {
    if (user && user.credits_remaining > 0 && gradingStatus === 'idle') {
      setGradingStatus('processing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerPostEvalVerification = async (freshUser) => {
    const profile = freshUser || user;
    if (!profile?.email || profile.email_verified) return;
    if (wasVerificationEmailSent()) return;
    try {
      await api.sendVerification();
      markVerificationEmailSent();
    } catch {
      try {
        await api.resendVerification(profile.email);
        markVerificationEmailSent();
      } catch {
        /* non-blocking */
      }
    }
  };

  const onGradingComplete = async () => {
    let currentSubId = submissionId;

    // submissionId is pre-set by Hero before navigation in the normal flow.
    // Fallback: if somehow not set, submit now (e.g. after login with pending essay).
    if (!currentSubId) {
      if ((user?.credits_remaining ?? 0) <= 0) {
        setGradingStatus('completed');
        navigate('/analysis-ready', { state: { outOfCredits: true } });
        return;
      }
      if (essayData?.essayContent) {
        try {
          const res = await api.submitAttempt({
            exam_type: essayData.examType || 'Academic',
            task_type: essayData.taskType || 'Task 2',
            essay_content: essayData.essayContent,
            question_text: essayData.questionContent || '',
            bullet_points: essayData.bulletPoints || [],
            letter_type: essayData.letterType || undefined,
            opening_line: essayData.openingLine || undefined,
            chart_type: essayData.chartType || undefined,
            chart_image:
              essayData.taskVariant === 'task1-report' && essayData.chartImage
                ? essayData.chartImage
                : undefined,
            exam_task_id: essayData.examTaskId || undefined,
            time_spent_seconds: essayData.timeSpentSeconds || 0,
          });
          currentSubId = res.submission_id;
          setSubmissionId(currentSubId);
          consumePendingGradePayload();
        } catch (err) {
          console.error('Failed to submit attempt:', err.message);
          setGradingStatus('completed');
          if (err.message && err.message.toLowerCase().includes('credit')) {
            navigate('/analysis-ready', { state: { outOfCredits: true } });
          } else {
            navigate('/performance');
          }
          return;
        }
      } else {
        setGradingStatus('completed');
        navigate('/performance');
        return;
      }
    }

    // Keep modal open (gradingStatus stays 'processing') while we poll the backend.
    // The modal will disappear naturally when we navigate away on completion.
    let attempts = 0;
    const maxAttempts = 40; // ~2 min at 3s intervals

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { status } = await api.checkStatus(currentSubId);
        if (status === 'graded') {
          clearInterval(pollRef.current);
          let fresh = null;
          try {
            fresh = await api.getMe();
            updateUser({
              credits_remaining: fresh.credits_remaining,
              email_verified: fresh.email_verified,
            });
          } catch {}
          await triggerPostEvalVerification(fresh);
          const report = await api.getReport(currentSubId);
          setGradingStatus('completed');
          navigate('/report', { state: { reportData: report, requireEmailVerify: fresh && !fresh.email_verified } });
        } else if (status === 'failed' || attempts >= maxAttempts) {
          clearInterval(pollRef.current);
          setGradingStatus('completed');
          navigate('/performance');
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(pollRef.current);
          setGradingStatus('completed');
          navigate('/performance');
        }
      }
    }, 3000);
  };

  // Cleanup poll on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const forceOutOfCredits = !!location.state?.outOfCredits;
  const isOutOfCredits = forceOutOfCredits || (user && user.credits_remaining <= 0);
  const hasCredits = !forceOutOfCredits && user && user.credits_remaining > 0;
  const isSubscribed = user?.subscription_status === 'active' || user?.is_subscribed === true;
  const outOfCreditsMessage = isSubscribed
    ? "You've used all your credits in your current subscription plan. Upgrade or wait for renewal to keep practicing."
    : "You've used your free credit. Upgrade now to access your results without losing progress.";

  const features = SUBSCRIPTION_FEATURES;

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    setSubscribeError('');
    try {
      const { url } = await api.createSubscriptionCheckout(planKeyFromSelection(selectedPlan));
      window.location.href = url;
    } catch (err) {
      setSubscribeError(err.message || 'Something went wrong. Please try again.');
      setSubscribeLoading(false);
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-white font-['Inter',_sans-serif]">
      <Navbar />
      
      {!hasCredits && (
        <main className={`max-w-[${isOutOfCredits ? '600px' : '960px'}] mx-auto px-6 pt-12 pb-20`}>
          {/* Header Section */}
          <div className={`mb-8 md:mb-10 ${isOutOfCredits ? 'text-center' : 'text-left'}`}>
            {isOutOfCredits ? (
              <>
                <h1 className="text-[28px] sm:text-[32px] md:text-[38px] font-bold text-[#1a1f36] leading-[1.2] md:leading-[1.3] tracking-tight mb-4">
                  Your Analysis Is Ready
                </h1>
                <p className="text-[16px] text-[#4B5563]">
                  {outOfCreditsMessage}
                </p>
              </>
            ) : (
              <h1 className="text-[28px] sm:text-[32px] md:text-[38px] font-bold text-[#1a1f36] leading-[1.2] md:leading-[1.3] tracking-tight">
                Your essay is ready for analysis.<br className="hidden md:block" />
                <span className="md:hidden"> </span>Choose your plan to reveal your score.
              </h1>
            )}
          </div>

          <div className={`grid grid-cols-1 ${isOutOfCredits ? '' : 'lg:grid-cols-2'} gap-6 md:gap-8 items-stretch`}>
            {/* Left Column: Free Plan */}
            {!isOutOfCredits && (
            <div className="bg-white rounded-[16px] p-6 sm:p-8 md:p-10 border border-[#E5E7EB] flex flex-col">
              <h2 className="text-[24px] font-bold text-[#1a1f36] mb-2">Free Plan</h2>
              <p className="text-[14px] text-[#1a1f36] font-medium mb-8">
                Get your first comprehensive report - No card needed.
              </p>

              <form onSubmit={handleSignup} className="space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">First Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter First Name" 
                      className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Last Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter Last Name" 
                      className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Email</label>
                  <input 
                    type="email" 
                    placeholder="Enter Email" 
                    className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]" 
                  />
                </div>

                <div className="relative">
                  <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Create Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter Password" 
                    className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF] pr-10" 
                  />
                  <div className="absolute right-4 top-[42px] text-[#9CA3AF] cursor-pointer">
                    <EyeOff className="w-5 h-5" />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Confirm Password</label>
                  <input 
                    type="password" 
                    placeholder="Re-enter Password" 
                    className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF] pr-10" 
                  />
                  <div className="absolute right-4 top-[42px] text-[#9CA3AF] cursor-pointer">
                    <EyeOff className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-[13px] text-[#6B7280] leading-relaxed py-2">
                  By clicking sign up, you agree to our <a href="#" className="text-[#3B82F6] hover:underline">Terms of Service</a> and <a href="#" className="text-[#3B82F6] hover:underline">Privacy Policy.</a>
                </p>

                <button 
                  type="submit" 
                  className="w-full h-[52px] bg-[#313E50] text-white rounded-[10px] font-bold text-[15px] hover:bg-[#252f3d] transition-all"
                >
                  Sign Up & Claim Free Report
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-[14px] text-[#4B5563]">
                  Already have an account? <button onClick={() => navigate('/login')} className="text-[#3B82F6] font-semibold hover:underline">Login</button>
                </p>
              </div>

              <div className="relative flex items-center justify-center my-6">
                <div className="flex-1 border-t border-[#E5E7EB]"></div>
                <span className="mx-4 text-[13px] text-[#6B7280]">or</span>
                <div className="flex-1 border-t border-[#E5E7EB]"></div>
              </div>

              <button className="w-full h-[52px] bg-white border border-[#E5E7EB] rounded-[10px] flex items-center justify-center gap-3 text-[15px] font-semibold text-[#1a1f36] hover:bg-[#F9FAFB] transition-all">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Sign up with Google
              </button>
            </div>
            )}

            {/* Right Column: Premium Plan */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border-[1.5px] border-[#4FA1FF] relative flex flex-col mt-4 lg:mt-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[22px] font-bold text-[#374151]">Premium Plan</h2>
                <div className="bg-[#D1F0FF] text-[#1e293b] text-[10px] font-semibold px-3 py-1.5 rounded-full">
                  Recommended
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="bg-[#F8FAFC] border border-[#F1F5F9] p-1 rounded-full flex items-center mb-6">
                {['Academic', 'General Training'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTrainingType(type)}
                    className={`flex-1 py-2 text-[12px] font-semibold rounded-full transition-all duration-300 ${
                      trainingType === type 
                        ? 'bg-[#0095FF] text-white shadow-[0_2px_4px_rgba(0,149,255,0.2)]' 
                        : 'text-[#6B7280] hover:text-[#1a1f36]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Plan Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
                {/* Weekly Plan */}
                <div 
                  onClick={() => setSelectedPlan('Weekly')}
                  className={`cursor-pointer rounded-[8px] p-3 transition-all duration-300 flex flex-col justify-center border ${
                    selectedPlan === 'Weekly' 
                      ? 'border-[#4FA1FF] bg-[#EAF5FF]' 
                      : 'border-[#E5E7EB] bg-white hover:border-[#4FA1FF]/40'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">Weekly Sprint</p>
                  <p className="text-[18px] font-extrabold text-[#1a1f36]">{SUBSCRIPTION_PLANS.weekly.price}{SUBSCRIPTION_PLANS.weekly.period}</p>
                </div>

                {/* Monthly Plan */}
                <div 
                  onClick={() => setSelectedPlan('Monthly')}
                  className={`cursor-pointer rounded-[8px] p-3 transition-all duration-300 flex flex-col justify-center border ${
                    selectedPlan === 'Monthly' 
                      ? 'border-[#4FA1FF] bg-[#EAF5FF]' 
                      : 'border-[#E5E7EB] bg-white hover:border-[#4FA1FF]/40'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">Monthly Mastery</p>
                  <p className="text-[18px] font-extrabold text-[#1a1f36]">{SUBSCRIPTION_PLANS.monthly.price}{SUBSCRIPTION_PLANS.monthly.period}</p>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-[18px] h-[18px] rounded-full bg-[#00D09C] flex items-center justify-center shrink-0">
                      <Check className="w-[12px] h-[12px] text-white" strokeWidth={3} />
                    </div>
                    <span className="text-[12px] font-medium text-[#374151] leading-snug">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div>
                {subscribeError && (
                  <p className="text-[12px] text-red-500 mb-2 text-center">{subscribeError}</p>
                )}
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeLoading}
                  className="w-full bg-[#313E50] text-white py-[14px] rounded-[8px] font-semibold text-[13px] mb-3 hover:bg-[#252f3d] transition-all disabled:opacity-60"
                >
                  {subscribeLoading ? 'Redirecting to Stripe…' : 'Subscribe & Unlock Unlimited Practice'}
                </button>
                <p className="text-[10px] text-[#6B7280] font-medium text-center">
                  Cancel anytime. No long-term commitment
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      <Footer />

      <AIProcessingModal 
        isOpen={gradingStatus === 'processing'} 
        onComplete={onGradingComplete}
      />
    </div>
  );
};

export default AnalysisReadyPage;
