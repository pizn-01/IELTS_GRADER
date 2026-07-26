import React, { useState } from 'react';
import { Check, EyeOff, Eye } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import AIProcessingModal from '../marketing/AIProcessingModal';
import PremiumConfirmationModal from '../marketing/PremiumConfirmationModal';
import { SUBSCRIPTION_FEATURES, planKeyFromSelection, SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { trackEvent } from '../utils/trackEvent';

const SelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const flow = location.state?.flow || null; // 'essay' | 'mock' | null

  const { gradingStatus, setGradingStatus, setSubmissionId, essayData, updateEssayData } = useGrade();
  const { user, register, signInWithGoogle } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Premium plan state
  const [trainingType, setTrainingType] = useState('Academic');
  const [selectedPlan, setSelectedPlan] = useState('Monthly');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumError, setPremiumError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName || !lastName || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      await register({ first_name: firstName, last_name: lastName, email, password });

      if (flow === 'essay' && essayData?.essayContent) {
        try {
          let examType = essayData.examType;
          let taskType = essayData.taskType;
          let questionText = essayData.questionContent || '';
          let meta = {
            bulletPoints: essayData.bulletPoints || [],
            letterType: essayData.letterType,
            openingLine: essayData.openingLine || '',
            chartType: essayData.chartType,
            taskVariant: essayData.taskVariant,
            chartImage: essayData.chartImage,
          };
          if (!examType || !taskType) {
            const detected = await api.detectTask(
              (questionText || essayData.essayContent).trim(),
            );
            examType = detected.exam_type;
            taskType = detected.task_type;
            questionText = questionText || detected.prompt || '';
            meta = {
              bulletPoints: detected.bulletPoints || [],
              letterType: detected.letterType,
              openingLine: detected.openingLine || '',
              chartType: detected.chartType,
              taskVariant: detected.task,
              chartImage: essayData.chartImage,
            };
            updateEssayData({
              examType,
              taskType,
              questionContent: questionText,
              ...meta,
            });
          }
          const res = await api.submitAttempt({
            exam_type: examType,
            task_type: taskType,
            essay_content: essayData.essayContent,
            question_text: questionText,
            bullet_points: meta.bulletPoints,
            letter_type: meta.letterType || undefined,
            opening_line: meta.openingLine || undefined,
            chart_type: meta.chartType || undefined,
            chart_image:
              meta.taskVariant === 'task1-report' && meta.chartImage
                ? meta.chartImage
                : undefined,
            time_spent_seconds: 0,
          });
          setSubmissionId(res.submission_id);
          setGradingStatus('processing');
          // AIProcessingModal shows in-page; onGradingComplete navigates to /report
        } catch {
          navigate('/dashboard');
        }
      } else if (flow === 'mock' && essayData?.essayContent) {
        try {
          const res = await api.submitAttempt({
            exam_type: essayData.examType,
            task_type: essayData.taskType,
            essay_content: essayData.essayContent,
            time_spent_seconds: 0,
          });
          setSubmissionId(res.submission_id);
          setGradingStatus('processing');
          navigate('/analysis-ready');
        } catch {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  const handlePremiumClick = () => {
    setPremiumError('');
    if (!user) {
      if (!firstName || !lastName || !email || !password || !confirmPassword) {
        setPremiumError('Please fill in your account details on the left before subscribing.');
        return;
      }
      if (password !== confirmPassword) {
        setPremiumError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setPremiumError('Password must be at least 6 characters.');
        return;
      }
    }
    setShowPremiumModal(true);
  };

  const handleConfirmPremium = async () => {
    setShowPremiumModal(false);
    setIsLoading(true);
    try {
      trackEvent('upgrade_cta_clicked', { source: 'selection_page' });
      if (!user) {
        await register({ first_name: firstName, last_name: lastName, email, password });
      }
      const { url } = await api.createSubscriptionCheckout(planKeyFromSelection(selectedPlan));
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Failed to start checkout. Please try again.');
      setIsLoading(false);
    }
  };

  const onGradingComplete = () => {
    setGradingStatus('completed');
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-white font-['Inter',_sans-serif]">
      <Navbar />

      <main className="max-w-[1240px] mx-auto px-[10px] pt-12 pb-20">
        <div className="mb-8 md:mb-10 text-left">
          <h1 className="text-[28px] sm:text-[32px] md:text-[38px] font-bold text-[#1a1f36] leading-[1.2] md:leading-[1.3] tracking-tight">
            Your essay is ready for analysis.<br className="hidden md:block" />
            <span className="md:hidden"> </span>Choose your plan to reveal your score.
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-[10px] items-stretch">
          {/* Left Column: Free Plan */}
          <div className="bg-white rounded-[16px] p-6 sm:p-8 md:p-10 border border-[#E5E7EB] flex flex-col w-full lg:w-[605px] shrink-0">
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
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Last Name</label>
                  <input
                    type="text"
                    placeholder="Enter Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]"
                />
              </div>

              <div className="relative">
                <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Create Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[48px] px-4 pr-10 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-[42px] text-[#9CA3AF] cursor-pointer">
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-[14px] font-medium text-[#1a1f36] mb-2">Confirm Password</label>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-[48px] px-4 pr-10 bg-white border border-[#E5E7EB] rounded-[8px] text-[15px] focus:border-[#3B82F6] outline-none transition-all placeholder:text-[#9CA3AF]"
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-4 top-[42px] text-[#9CA3AF] cursor-pointer">
                  {showConfirm ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-[13px] text-[#6B7280] leading-relaxed py-2">
                By clicking sign up, you agree to our{' '}
                <a href="#" className="text-[#3B82F6] hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-[#3B82F6] hover:underline">Privacy Policy.</a>
              </p>

              {error && (
                <p className="text-[13px] text-red-500 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] bg-[#313E50] text-white rounded-[10px] font-bold text-[15px] hover:bg-[#252f3d] active:bg-[#1a1f36] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account…' : 'Sign Up & Claim Free Report'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-[14px] text-[#4B5563]">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-[#3B82F6] font-semibold hover:underline">
                  Login
                </button>
              </p>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="flex-1 border-t border-[#E5E7EB]"></div>
              <span className="mx-4 text-[13px] text-[#6B7280]">or</span>
              <div className="flex-1 border-t border-[#E5E7EB]"></div>
            </div>

            <button
              onClick={handleGoogleSignup}
              className="w-full h-[52px] bg-white border border-[#E5E7EB] rounded-[10px] flex items-center justify-center gap-3 text-[15px] font-semibold text-[#1a1f36] hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-all"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Sign up with Google
            </button>
          </div>

          {/* Right Column: Premium Plan */}
          <div className="bg-white rounded-[12px] p-6 sm:p-8 border-[1.5px] border-[#4FA1FF] relative flex flex-col w-full lg:w-[605px] shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold text-[#374151]">Premium Plan</h2>
              <div className="bg-[#D1F0FF] text-[#1e293b] text-[10px] font-semibold px-3 py-1.5 rounded-full">
                Recommended
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 mb-6">
              <div
                onClick={() => setSelectedPlan('Weekly')}
                className={`cursor-pointer rounded-[8px] p-2.5 sm:p-3 transition-all duration-300 flex flex-col justify-center border ${
                  selectedPlan === 'Weekly'
                    ? 'border-[#4FA1FF] bg-[#EAF5FF]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#4FA1FF]/40'
                }`}
              >
                <p className="text-[10px] sm:text-[11px] font-semibold text-[#6B7280] mb-1 sm:mb-1.5 leading-tight">Weekly Sprint</p>
                <p className="text-[15px] sm:text-[18px] font-extrabold text-[#1a1f36] leading-tight tracking-tight">{SUBSCRIPTION_PLANS.weekly.price}{SUBSCRIPTION_PLANS.weekly.period}</p>
              </div>
              <div
                onClick={() => setSelectedPlan('Monthly')}
                className={`cursor-pointer rounded-[8px] p-2.5 sm:p-3 transition-all duration-300 flex flex-col justify-center border ${
                  selectedPlan === 'Monthly'
                    ? 'border-[#4FA1FF] bg-[#EAF5FF]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#4FA1FF]/40'
                }`}
              >
                <p className="text-[10px] sm:text-[11px] font-semibold text-[#6B7280] mb-1 sm:mb-1.5 leading-tight">Monthly Mastery</p>
                <p className="text-[15px] sm:text-[18px] font-extrabold text-[#1a1f36] leading-tight tracking-tight">{SUBSCRIPTION_PLANS.monthly.price}{SUBSCRIPTION_PLANS.monthly.period}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {SUBSCRIPTION_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-[18px] h-[18px] rounded-full bg-[#00D09C] flex items-center justify-center shrink-0">
                    <Check className="w-[12px] h-[12px] text-white" strokeWidth={3} />
                  </div>
                  <span className="text-[12px] font-medium text-[#374151] leading-snug">{feature}</span>
                </div>
              ))}
            </div>

            <div>
              <button
                onClick={handlePremiumClick}
                className="w-full bg-[#313E50] text-white py-[14px] rounded-[8px] font-semibold text-[13px] mb-3 hover:bg-[#252f3d] active:bg-[#1a1f36] transition-all"
              >
                Subscribe from {SUBSCRIPTION_PLANS.weekly.label}
              </button>
              {premiumError && (
                <p className="text-[13px] text-red-500 font-medium text-center mb-2">{premiumError}</p>
              )}
              <p className="text-[10px] text-[#6B7280] font-medium text-center">
                Cancel anytime. No long-term commitment
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AIProcessingModal
        isOpen={gradingStatus === 'processing'}
        onComplete={onGradingComplete}
      />

      <PremiumConfirmationModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onConfirm={handleConfirmPremium}
        planName={selectedPlan === 'Weekly' ? 'Weekly Sprint' : 'Monthly Mastery'}
        price={selectedPlan === 'Weekly' ? SUBSCRIPTION_PLANS.weekly.label : SUBSCRIPTION_PLANS.monthly.label}
      />
    </div>
  );
};

export default SelectionPage;
