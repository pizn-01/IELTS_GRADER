import React, { useState } from 'react';
import { Check, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const AnalysisReadyPage = () => {
  const navigate = useNavigate();
  const [trainingType, setTrainingType] = useState('Academic'); 
  const [selectedPlan, setSelectedPlan] = useState('Monthly'); 

  const features = [
    "Unlimited Essay Evaluations",
    "Limit 20 exams per week and 100 exams per month",
    "Detailed Fix Cards & Grammar Analysis",
    "Priority Support"
  ];

  const handleSignup = (e) => {
    e.preventDefault();
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-white font-['Inter',_sans-serif]">
      <Navbar />
      
      <main className="max-w-[960px] mx-auto px-6 pt-12 pb-20">
        {/* Header Section */}
        <div className="mb-8 md:mb-10 text-left">
          <h1 className="text-[28px] sm:text-[32px] md:text-[38px] font-bold text-[#1a1f36] leading-[1.2] md:leading-[1.3] tracking-tight">
            Your essay is ready for analysis.<br className="hidden md:block" />
            <span className="md:hidden"> </span>Choose your plan to reveal your score.
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {/* Left Column: Free Plan */}
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
                <p className="text-[18px] font-extrabold text-[#1a1f36]">$9.99/Week</p>
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
                <p className="text-[18px] font-extrabold text-[#1a1f36]">$24.99/Month</p>
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
              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#313E50] text-white py-[14px] rounded-[8px] font-semibold text-[13px] mb-3 hover:bg-[#252f3d] transition-all"
              >
                Subscribe & Unlock Unlimited Practice
              </button>
              <p className="text-[10px] text-[#6B7280] font-medium text-center">
                Cancel anytime. No long-term commitment
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AnalysisReadyPage;
