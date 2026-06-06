import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronDown, CreditCard, Check } from 'lucide-react';
import { api } from '../services/api';

const PACKS = [
  {
    id: 'price_1TcqK9FDM9NsOfLRmmYyoSTh',
    key: 'starter',
    name: 'Starter Top Up',
    credits: 10,
    price: 12.00,
    label: '10 credits',
    description: 'Best for short practice sprints',
  },
  {
    id: 'price_1TcqPbFDM9NsOfLRquDNOJpA',
    key: 'smart',
    name: 'Smart Top Up',
    credits: 24,
    price: 24.00,
    label: '24 credits',
    description: 'Most chosen by active learners',
    recommended: true,
  },
  {
    id: 'price_1TcqRfFDM9NsOfLRbZgZMEKc',
    key: 'intensive',
    name: 'Intensive Top Up',
    credits: 50,
    price: 44.00,
    label: '50 credits',
    description: 'For writing every week',
  },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Allow pre-selection via route state: navigate('/checkout', { state: { pack: 'starter' } })
  const preselect = location.state?.pack || 'smart';
  const [selectedKey, setSelectedKey] = useState(preselect);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = PACKS.find(p => p.key === selectedKey) || PACKS[1];

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const { url } = await api.createCheckoutSession(selected.id);
      window.location.href = url; // redirect to Stripe Checkout
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-['Inter',_sans-serif]">

      {/* Left Column: Summary (Sky Blue) */}
      <div className="w-full lg:w-1/2 bg-[#4FA1FF] text-white flex flex-col lg:min-h-screen py-10 px-6 lg:py-12 lg:px-0 lg:pl-[14%] xl:pl-[18%]">
        <div className="w-full max-w-[380px] mx-auto lg:mx-0">
          {/* Logo & Back */}
          <div className="flex items-center gap-4 mb-10 md:mb-14">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all border-none"
            >
              <ChevronLeft className="w-5 h-5 text-white pr-0.5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-[30px] h-[30px] bg-black rounded-full flex items-center justify-center p-1.5">
                <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
              </div>
              <span className="text-[15px] font-extrabold tracking-tight">IELTSGRADER</span>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold mb-1 opacity-90">One-time payment</p>
            <div className="flex items-end gap-2 mb-8 md:mb-12">
              <span className="text-[38px] md:text-[44px] font-extrabold leading-none tracking-tight">${selected.price.toFixed(2)}</span>
              <div className="text-[11px] font-medium leading-[1.3] pb-1 opacity-90">
                {selected.credits} <br /> credits
              </div>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[13px] font-semibold">{selected.name}</span>
                  <span className="text-[13px] font-semibold">${selected.price.toFixed(2)}</span>
                </div>
                <p className="text-[11px] opacity-70">{selected.description}</p>
              </div>

              <div className="w-full h-[1px] bg-white/20"></div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium opacity-90">Subtotal</span>
                  <span className="font-semibold">${selected.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium opacity-90">Tax</span>
                  <span className="font-semibold">$0.00</span>
                </div>
              </div>

              <div className="w-full h-[1px] bg-white/20"></div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Add Promotion Code"
                  className="w-full h-[48px] px-4 bg-white/15 border border-white/10 rounded-[8px] text-[14px] text-white placeholder:text-white/70 outline-none focus:bg-white/25 transition-all appearance-none"
                />
              </div>

              <div className="w-full h-[1px] bg-white/20"></div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[14px] font-bold">Total due today</span>
                <span className="text-[14px] font-bold">${selected.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Pack Selection + Pay */}
      <div className="w-full lg:w-1/2 flex justify-center items-start bg-white overflow-y-auto py-10 px-6 lg:py-12 lg:px-0">
        <div className="w-full max-w-[380px] space-y-6">

          {/* Credit Pack Selection */}
          <section>
            <h2 className="text-[16px] font-semibold text-[#1a1f36] mb-3">Select credit pack</h2>
            <div className="space-y-3">
              {PACKS.map(pack => (
                <button
                  key={pack.key}
                  onClick={() => setSelectedKey(pack.key)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[10px] border-[1.5px] transition-all text-left ${
                    selectedKey === pack.key
                      ? 'border-[#4FA1FF] bg-[#EAF5FF]'
                      : 'border-[#E5E7EB] hover:border-[#4FA1FF]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedKey === pack.key ? 'border-[#4FA1FF] bg-[#4FA1FF]' : 'border-[#D1D5DB]'
                    }`}>
                      {selectedKey === pack.key && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1a1f36]">
                        {pack.name}
                        {pack.recommended && <span className="ml-2 text-[10px] font-semibold text-[#4FA1FF] bg-[#EAF5FF] px-2 py-0.5 rounded-full">Popular</span>}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">{pack.label} · {pack.description}</p>
                    </div>
                  </div>
                  <span className="text-[14px] font-bold text-[#1a1f36]">${pack.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Contact Info */}
          <section>
            <h2 className="text-[16px] font-semibold text-[#1a1f36] mb-3">Contact information</h2>
            <div className="w-full h-[48px] px-4 bg-[#F3F4F6] border border-[#E5E7EB] rounded-[8px] flex items-center justify-between">
              <span className="text-[14px] text-[#6B7280]">Email</span>
              <span className="text-[14px] text-[#111827] font-medium">Collected at checkout</span>
            </div>
          </section>

          {/* Payment Method */}
          <section>
            <h2 className="text-[16px] font-bold text-[#1a1f36] mb-4">Payment method</h2>

            <div className="space-y-5">
              {/* Card preview (visual only — actual payment handled by Stripe) */}
              <div>
                <label className="block text-[14px] font-medium text-[#374151] mb-2">Card information</label>
                <div className="border border-[#E5E7EB] rounded-[8px] overflow-hidden bg-white">
                  <div className="h-[48px] px-4 flex items-center justify-between border-b border-[#E5E7EB]">
                    <input type="text" placeholder="Enter text" className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#9CA3AF] appearance-none" disabled />
                    <div className="flex items-center gap-2">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MC" className="h-5" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-4" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PP" className="h-4" />
                    </div>
                  </div>
                  <div className="flex h-[48px]">
                    <input type="text" placeholder="MM / YY" className="w-1/2 sm:w-2/3 px-4 border-r border-[#E5E7EB] outline-none text-[14px] placeholder:text-[#9CA3AF] appearance-none" disabled />
                    <div className="w-1/2 sm:w-1/3 px-4 flex items-center justify-between">
                      <input type="text" placeholder="CVC" className="w-full bg-transparent outline-none text-[14px] placeholder:text-[#9CA3AF] appearance-none" disabled />
                      <CreditCard className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">Card details are entered securely on the next page via Stripe.</p>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="block text-[14px] font-medium text-[#374151] mb-2">Cardholder name</label>
                <input
                  type="text"
                  placeholder="Full name on card"
                  className="w-full h-[48px] px-4 border border-[#E5E7EB] rounded-[8px] text-[14px] outline-none focus:border-[#4FA1FF] transition-all placeholder:text-[#9CA3AF] appearance-none"
                  disabled
                />
              </div>

              {/* Billing Address */}
              <div>
                <label className="block text-[14px] font-medium text-[#374151] mb-2">Country or region</label>
                <div className="border border-[#E5E7EB] rounded-[8px] overflow-hidden bg-white">
                  <div className="relative h-[48px] px-4 flex items-center bg-white border-b border-[#E5E7EB]">
                    <span className="text-[14px] text-[#111827] flex-1">Nigeria</span>
                    <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                  <input type="text" placeholder="Address line 1" className="w-full h-[48px] px-4 border-b border-[#E5E7EB] text-[14px] outline-none placeholder:text-[#9CA3AF] appearance-none" disabled />
                  <input type="text" placeholder="Address line 2" className="w-full h-[48px] px-4 border-b border-[#E5E7EB] text-[14px] outline-none placeholder:text-[#9CA3AF] appearance-none" disabled />
                  <input type="text" placeholder="Suburb" className="w-full h-[48px] px-4 border-b border-[#E5E7EB] text-[14px] outline-none placeholder:text-[#9CA3AF] appearance-none" disabled />
                  <div className="flex h-[48px] border-b border-[#E5E7EB]">
                    <input type="text" placeholder="City" className="w-1/2 sm:w-2/3 px-4 border-r border-[#E5E7EB] outline-none text-[14px] placeholder:text-[#9CA3AF] appearance-none" disabled />
                    <input type="text" placeholder="Postal code" className="w-1/2 sm:w-1/3 px-4 outline-none text-[14px] placeholder:text-[#9CA3AF] appearance-none" disabled />
                  </div>
                  <div className="relative h-[48px] px-4 flex items-center bg-white">
                    <span className="text-[14px] text-[#9CA3AF] flex-1">State</span>
                    <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 rounded-[8px] px-4 py-2.5">{error}</p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full h-[52px] bg-[#1a1f36] text-white rounded-[10px] font-bold text-[15px] mt-6 hover:bg-[#2a2f46] transition-all active:scale-[0.99] appearance-none border-none disabled:opacity-60"
          >
            {loading ? 'Redirecting to Stripe…' : `Pay $${selected.price.toFixed(2)} — ${selected.label}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
