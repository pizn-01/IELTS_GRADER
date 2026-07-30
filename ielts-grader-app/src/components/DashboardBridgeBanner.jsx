import React from 'react';
import { LayoutDashboard } from 'lucide-react';

/**
 * Unmissable CTA after first exam — forces the dashboard discovery beat.
 */
export default function DashboardBridgeBanner({ onContinue }) {
  return (
    <div className="mx-4 md:mx-6 mb-4 rounded-[14px] border border-[#B2DDFF] bg-[#EFF8FF] px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="min-w-0 flex items-start gap-3">
        <div className="mt-0.5 w-9 h-9 rounded-[10px] bg-[#175CD3] text-white flex items-center justify-center shrink-0">
          <LayoutDashboard size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#101828]">Your progress dashboard is ready</p>
          <p className="text-[13px] text-[#475467] mt-0.5 leading-snug">
            See your overall band trend, fix priorities, and study plan before your next practice.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="shrink-0 h-[42px] px-5 rounded-[10px] bg-[#175CD3] text-white text-[13px] font-semibold hover:bg-[#1349a8] transition-colors"
      >
        Continue to Dashboard
      </button>
    </div>
  );
}
