import React, { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import Footer from '../marketing/Footer';
import SeoHead from '../seo/SeoHead';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans';
import { trackEvent } from '../utils/trackEvent';

const { weekly: WEEKLY, monthly: MONTHLY } = SUBSCRIPTION_PLANS;

const PricingPage = () => {
  const navigate = useNavigate();
  const [trainingType, setTrainingType] = useState('Academic'); // Academic, General
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const plans = [
    {
      name: "Free Trial",
      price: "$0",
      description: "Get started with your first evaluation.",
      features: [
        "3 free full evaluations",
        "Band score breakdown",
        "Fix cards & feedback",
        "No card required"
      ],
      buttonText: "Start Free",
      isPremium: false
    },
    {
      name: "Weekly Sprint",
      price: WEEKLY.price,
      period: WEEKLY.period,
      description: "Intensive practice for fast results.",
      features: [
        "20 evaluations per week",
        "Detailed fix cards",
        "All task types",
        "Priority support"
      ],
      buttonText: "Get Sprint",
      isPremium: true
    },
    {
      name: "Monthly Mastery",
      price: MONTHLY.price,
      period: MONTHLY.period,
      description: "Best value for serious prep.",
      features: [
        "80 evaluations per month",
        "Comprehensive reports",
        "Personalized learning guides",
        "25% less per exam vs weekly"
      ],
      buttonText: "Get Monthly",
      isPremium: true,
      highlight: "Best Value"
    }
  ];

  return (
    <div className="min-h-screen bg-[#EFF6FF]">
      <SeoHead
        title="IELTS Writing Practice Plans & Pricing | IELTS AI Tutor"
        description="Start free with three full IELTS writing evaluations. Upgrade to Weekly Sprint or Monthly Mastery for more AI tutor feedback, mock exams, and study plans."
        path="/pricing"
      />
      <Navbar />
      
      <main className="max-w-[1200px] mx-auto px-6 py-12 md:px-[60px] md:py-[80px]">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="bg-white p-1 rounded-full border border-[#E5E7EB] flex items-center shadow-sm w-full max-w-sm md:w-auto">
            {['Academic', 'General Training'].map(type => (
              <button
                key={type}
                onClick={() => setTrainingType(type)}
                className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-full text-[13px] md:text-[14px] font-bold transition-all ${
                  trainingType === type 
                    ? 'bg-[#1a1f36] text-white' 
                    : 'text-[#6B7280] hover:text-[#1a1f36]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#1a1f36] mb-3 md:mb-4">Choose Your Path to Success</h1>
          <p className="text-[14px] md:text-[16px] text-[#6B7280]">Select the plan that fits your IELTS preparation goals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-[1100px] mx-auto">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`bg-white rounded-[16px] p-6 md:p-8 border-2 transition-all hover:shadow-xl flex flex-col ${
                plan.highlight ? 'border-[#3B82F6] relative shadow-lg md:scale-105 z-10 mt-4 md:mt-0' : 'border-[#E5E7EB]'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                  {plan.highlight}
                </span>
              )}
              
              <div className="mb-8">
                <h3 className="text-[20px] font-bold text-[#1a1f36] mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[42px] font-extrabold text-[#1a1f36]">{plan.price}</span>
                  {plan.period && <span className="text-[16px] text-[#6B7280]">{plan.period}</span>}
                </div>
                <p className="text-[14px] text-[#6B7280]">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#10B981]" strokeWidth={3} />
                    </div>
                    <span className="text-[14px] text-[#374151] leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  if (plan.isPremium) {
                    trackEvent('upgrade_cta_clicked', { source: 'pricing_plan_card', plan: plan.name });
                    setShowPremiumModal(true);
                  } else {
                    navigate('/report');
                  }
                }}
                className={`w-full h-[50px] rounded-[10px] font-bold text-[15px] transition-all mt-auto ${
                  plan.isPremium 
                    ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-[0_4px_14px_rgba(59,130,246,0.4)]' 
                    : 'bg-white text-[#1a1f36] border border-[#E5E7EB] hover:border-[#1a1f36]'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Premium Confirmation Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 w-full max-w-[400px] text-center relative animate-fadeIn">
            <button 
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#1a1f36]"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-[#3B82F6]" />
            </div>
            
            <h2 className="text-[22px] font-bold text-[#1a1f36] mb-2">Subscribe to Premium</h2>
            <p className="text-[14px] text-[#6B7280] mb-8 leading-relaxed">
              Weekly Sprint ({WEEKLY.label}, {WEEKLY.credits} exams) or Monthly Mastery ({MONTHLY.label}, {MONTHLY.credits} exams). Cancel anytime.
            </p>

            <button 
              onClick={() => {
                trackEvent('upgrade_cta_clicked', { source: 'pricing_page' });
                navigate('/upgrade');
              }}
              className="w-full bg-[#1a1f36] text-white py-[14px] rounded-[10px] font-bold text-[15px] mb-3 hover:bg-[#2a2f46] transition-all"
            >
              Continue to Plans
            </button>
            <button 
              onClick={() => setShowPremiumModal(false)}
              className="w-full py-[12px] text-[14px] font-medium text-[#6B7280] hover:text-[#1a1f36]"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default PricingPage;
