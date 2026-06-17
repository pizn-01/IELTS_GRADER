import React, { useState } from 'react';
import { Check } from 'lucide-react';
import Navbar from '../marketing/Navbar';
import { api } from '../services/api';

// TODO: Replace these with your actual Stripe recurring price IDs from the Stripe dashboard.
const PLANS = [
  {
    priceId: 'price_weekly_sprint',
    name: 'Weekly Sprint',
    price: '$9.99',
    period: '/Week',
  },
  {
    priceId: 'price_monthly_mastery',
    name: 'Monthly Mastery',
    price: '$24.99',
    period: '/Month',
    recommended: true,
  },
];

const FEATURES = [
  'Unlimited Essay Evaluations',
  'Limit 20 exams per week and 100 exams per month',
  'Detailed Fix Cards & Grammar Analysis',
  'Priority Support',
];

const UpgradePage = () => {
  const [examType, setExamType] = useState('Academic');
  const [selectedPriceId, setSelectedPriceId] = useState(PLANS[1].priceId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = PLANS.find(p => p.priceId === selectedPriceId) || PLANS[1];

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const { url } = await api.createSubscriptionCheckout(selectedPriceId);
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar showCredits={true} />

      <main className="flex flex-col items-center px-4 py-12">
        <h1 className="text-[28px] md:text-[32px] font-bold text-[#101828] mb-10 text-center">
          Choose One of The Plan
        </h1>

        <div className="w-full max-w-[540px] bg-white border border-[#E5E7EB] rounded-[24px] shadow-sm p-8 md:p-10">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#101828]">Premium Plan</h2>
            <span className="text-[13px] font-semibold text-[#475467] bg-[#F2F4F7] px-4 py-1.5 rounded-full">
              Recommended
            </span>
          </div>

          {/* Exam Type Toggle */}
          <div className="flex bg-[#F2F4F7] rounded-full p-1 mb-6">
            {['Academic', 'General Training'].map(type => (
              <button
                key={type}
                onClick={() => setExamType(type)}
                className={`flex-1 py-2 rounded-full text-[13px] font-semibold transition-all ${
                  examType === type
                    ? 'bg-[#1A96F3] text-white shadow-sm'
                    : 'text-[#667085] hover:text-[#344054]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Plan Selector */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {PLANS.map(plan => (
              <button
                key={plan.priceId}
                onClick={() => setSelectedPriceId(plan.priceId)}
                className={`p-5 rounded-[16px] border-2 text-left transition-all ${
                  selectedPriceId === plan.priceId
                    ? 'border-[#1A96F3] bg-[#EFF8FF]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D0D5DD]'
                }`}
              >
                <p className="text-[13px] font-medium text-[#667085] mb-1">{plan.name}</p>
                <p className="text-[20px] font-bold text-[#101828]">
                  {plan.price}
                  <span className="text-[14px] font-semibold text-[#667085]">{plan.period}</span>
                </p>
              </button>
            ))}
          </div>

          {/* Feature List */}
          <div className="space-y-3 mb-8">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#12B76A] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#344054] leading-snug">{feature}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] text-[#EA4335] bg-red-50 rounded-[8px] px-4 py-2.5 mb-4 text-center">
              {error}
            </p>
          )}

          {/* CTA Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full h-[52px] bg-[#101828] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60 mb-4"
          >
            {loading
              ? 'Redirecting to Stripe…'
              : `Subscribe & Unlock Unlimited Practice — ${selectedPlan.price}${selectedPlan.period}`}
          </button>

          <p className="text-center text-[13px] text-[#667085]">
            Cancel anytime. No long-term commitment
          </p>
        </div>
      </main>
    </div>
  );
};

export default UpgradePage;
