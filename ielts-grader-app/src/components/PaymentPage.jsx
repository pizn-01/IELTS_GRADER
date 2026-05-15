import React from 'react';
import { ArrowLeft, CreditCard, ChevronDown } from 'lucide-react';

const PaymentPage = ({ pack, onBack, onComplete }) => {
  if (!pack) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col md:flex-row animate-in fade-in duration-300">
      {/* Left Panel - Order Summary */}
      <div className="w-full md:w-[45%] bg-[#1A96F3] text-white p-8 md:p-16 md:pt-20 flex flex-col">
        {/* Header with Back & Logo */}
        <div className="flex items-center gap-6 mb-16">
          <button 
            onClick={onBack}
            className="text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center overflow-hidden bg-[#101828]">
               <div className="w-full h-full flex flex-col">
                 <div className="h-1/2 bg-white/10" />
                 <div className="h-1/2 bg-[#1A96F3]" />
               </div>
            </div>
            <span className="text-[18px] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>IELTSGRADER</span>
          </div>
        </div>

        {/* Amount Section */}
        <div className="space-y-1 mb-16">
          <p className="text-white/80 text-[16px] font-medium opacity-90">Subscription fee</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[56px] md:text-[68px] font-bold leading-tight tracking-tight">{pack.price}</span>
            <span className="text-white/80 text-[16px] font-medium">Per <br/> month</span>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="space-y-8 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[16px] tracking-tight">{pack.name} - Credits Pack</span>
              <span className="text-white/60 text-[14px]">Billed one-time</span>
            </div>
            <span className="font-bold text-[16px]">{pack.price}</span>
          </div>

          <div className="h-px bg-white/20 w-full" />

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-white/90 text-[16px] font-medium">Subtotal</span>
              <span className="font-bold text-[16px]">{pack.price}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/90 text-[16px] font-medium">Tax</span>
              <span className="font-bold text-[16px]">$0.00</span>
            </div>
          </div>

          <div className="h-px bg-white/20 w-full" />

          <div className="pt-2">
             <div className="w-full h-[56px] bg-white/20 rounded-[12px] flex items-center px-6 text-white/90 text-[15px] font-medium cursor-text shadow-inner">
               Add Promotion Code
             </div>
          </div>

          <div className="h-px bg-white/20 w-full mt-8" />

          <div className="pt-2 flex justify-between items-center">
            <span className="text-[16px] font-medium text-white/90">Total due today</span>
            <span className="text-[20px] font-bold">{pack.price}</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Payment Form */}
      <div className="flex-1 bg-white p-8 md:p-16 overflow-y-auto custom-scrollbar">
        <div className="max-w-[480px] mx-auto space-y-10">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-[#101828]">Contact information</h3>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Email</label>
              <div className="w-full h-[52px] px-4 bg-[#F8FAFC] border border-gray-100 rounded-[8px] flex items-center text-[15px] text-[#101828] font-medium">
                johndoe@gmail.com
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-6">
            <h3 className="text-[16px] font-bold text-[#101828]">Payment method</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Card information</label>
                <div className="space-y-[-1px]">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="1234 5678 1234 5678"
                      className="w-full h-[52px] px-4 bg-white border border-gray-200 rounded-t-[8px] text-[15px] focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] outline-none transition-all pr-32"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <div className="w-8 h-5 bg-[#1A1F71] rounded-sm flex items-center justify-center">
                        <span className="text-[6px] font-bold text-white italic">VISA</span>
                      </div>
                      <div className="w-8 h-5 bg-[#EB001B] rounded-sm relative flex items-center justify-center overflow-hidden">
                        <div className="absolute -left-1 w-4 h-4 rounded-full bg-[#FF5F00] opacity-80" />
                        <div className="absolute -right-1 w-4 h-4 rounded-full bg-[#F79E1B] opacity-80" />
                      </div>
                      <div className="w-8 h-5 bg-[#0070D1] rounded-sm flex items-center justify-center">
                        <span className="text-[6px] font-bold text-white">AMEX</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex">
                    <input 
                      type="text" 
                      placeholder="MM / YY"
                      className="flex-1 h-[52px] px-4 bg-white border border-gray-200 rounded-bl-[8px] text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all"
                    />
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="CVC"
                        className="w-full h-[52px] px-4 bg-white border border-gray-200 rounded-br-[8px] border-l-0 text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all"
                      />
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Cardholder name</label>
                <input 
                  type="text" 
                  placeholder="Full name on card"
                  className="w-full h-[52px] px-4 bg-white border border-gray-200 rounded-[8px] text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Country or region</label>
                <div className="space-y-[-1px]">
                  <div className="relative">
                    <select className="w-full h-[52px] px-4 bg-white border border-gray-200 rounded-t-[8px] text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all appearance-none">
                      <option>Nigeria</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>Canada</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Address line 1"
                    className="w-full h-[52px] px-4 bg-white border border-gray-200 text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all border-t-0"
                  />
                  <input 
                    type="text" 
                    placeholder="Address line 2"
                    className="w-full h-[52px] px-4 bg-white border border-gray-200 text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all border-t-0"
                  />
                  <input 
                    type="text" 
                    placeholder="Suburb"
                    className="w-full h-[52px] px-4 bg-white border border-gray-200 text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all border-t-0"
                  />
                  <div className="flex">
                    <input 
                      type="text" 
                      placeholder="City"
                      className="flex-1 h-[52px] px-4 bg-white border border-gray-200 text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all border-t-0"
                    />
                    <input 
                      type="text" 
                      placeholder="Postal code"
                      className="flex-1 h-[52px] px-4 bg-white border border-gray-200 border-l-0 text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all border-t-0"
                    />
                  </div>
                  <div className="relative">
                    <select className="w-full h-[52px] px-4 bg-white border border-gray-200 rounded-b-[8px] text-[15px] focus:ring-2 focus:ring-[#55A4FF]/20 focus:border-[#55A4FF] outline-none transition-all appearance-none border-t-0">
                      <option>State</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={onComplete}
            className="w-full h-[56px] bg-[#55A4FF] text-white rounded-[8px] text-[16px] font-bold hover:bg-[#4493EE] transition-all shadow-lg shadow-blue-100 flex items-center justify-center"
          >
            Pay {pack.price}
          </button>

          <p className="text-[12px] text-gray-400 text-center leading-relaxed">
            By subscribing, you authorize IELTSGRADER to charge your card for this and future payments in accordance with their terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
