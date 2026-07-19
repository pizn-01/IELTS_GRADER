import React from 'react';
import { Download, Loader2, Lock, Sparkles } from 'lucide-react';
import { BandSnapshot, ErrorsByAreaChart, TopMistakesList } from './LearningEditionSnapshot';

function StatusBadge({ status }) {
  const map = {
    locked: { label: 'Locked', className: 'bg-gray-100 text-gray-600' },
    preview: { label: 'Ready to generate', className: 'bg-blue-50 text-blue-700' },
    pending_payment: { label: 'Processing payment', className: 'bg-amber-50 text-amber-700' },
    generating: { label: 'Generating', className: 'bg-amber-50 text-amber-700' },
    ready: { label: 'Ready', className: 'bg-green-50 text-green-700' },
    failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
  };
  const cfg = map[status] || map.preview;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function LearningEditionPanel({
  edition,
  freeAccess,
  priceCents,
  busy,
  onPurchase,
  onDownload,
  onRetry,
  className = '',
}) {
  if (!edition) {
    return (
      <div className={`bg-white rounded-[20px] border border-[#E5E7EB] p-10 text-center text-gray-400 text-[14px] flex-1 flex items-center justify-center min-h-[280px] lg:min-h-[400px] ${className}`}>
        Select an edition above
      </div>
    );
  }

  const { examRange, status, preview, examsNeeded, errorMessage } = edition;
  const locked = !edition.unlocked;
  const isReady = status === 'ready';
  const isWorking = status === 'generating' || status === 'pending_payment';
  const canGenerate = status === 'preview';
  const canRetry = status === 'failed';

  return (
    <div className={`bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex-1 flex flex-col lg:min-h-[400px] ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB] flex-1 lg:min-h-0 lg:grid-rows-1">
        {/* Left: mistake details (text) */}
        <div className="p-5 md:p-6 flex flex-col gap-3 lg:h-full lg:min-h-0">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-[15px] font-bold text-[#101828]">
                Exams {examRange.start}–{examRange.end}
              </h3>
              <p className="text-[11px] text-[#667085] mt-0.5">Top mistakes to address</p>
            </div>
            <StatusBadge status={status} />
          </div>

          {locked ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8">
              <Lock size={20} className="text-gray-300" />
              <p className="text-[12px] text-gray-500">
                Complete {examsNeeded} more exam{examsNeeded !== 1 ? 's' : ''} to unlock
              </p>
            </div>
          ) : (
            <TopMistakesList topErrors={preview?.topErrors} />
          )}
        </div>

        {/* Right: band + error distribution charts + CTA */}
        <div className="p-5 md:p-6 flex flex-col gap-4 lg:h-full lg:min-h-0">
          {locked ? (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
              <p className="text-[12px] text-[#667085] leading-relaxed max-w-[240px]">
                Band trends and error breakdown appear here once this edition unlocks.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0 order-2 lg:order-none">
              <BandSnapshot avgBands={preview?.avgBands} />
              <ErrorsByAreaChart errorsByCriteria={preview?.errorsByCriteria} />
            </div>
          )}

          <div className="shrink-0 relative z-[1] bg-white space-y-2 order-1 lg:order-none lg:pt-3 lg:mt-1 lg:border-t lg:border-gray-100">
            {!locked && (
              <div className="flex flex-wrap items-center gap-2">
                {canGenerate && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPurchase(edition.editionNumber)}
                    className="flex items-center gap-2 bg-[#2C3E50] hover:bg-[#1D2939] text-white font-bold text-[12px] px-4 py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {freeAccess ? 'Generate PDF' : `Get PDF ($${(priceCents / 100).toFixed(0)})`}
                  </button>
                )}
                {isReady && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDownload(edition.editionNumber)}
                    className="flex items-center gap-2 border border-[#1A96F3] text-[#1A96F3] font-bold text-[12px] px-4 py-2.5 rounded-xl hover:bg-blue-50 disabled:opacity-60"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                )}
                {canRetry && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRetry(edition.editionNumber)}
                    className="flex items-center gap-2 bg-[#2C3E50] text-white font-bold text-[12px] px-4 py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Retry
                  </button>
                )}
                {isWorking && (
                  <span className="flex items-center gap-1.5 text-[11px] text-amber-600">
                    <Loader2 size={12} className="animate-spin" />
                    Preparing…
                  </span>
                )}
                {!freeAccess && canGenerate && (
                  <span className="text-[10px] text-gray-400">${(priceCents / 100).toFixed(0)} one-time</span>
                )}
                {freeAccess && canGenerate && (
                  <span className="text-[10px] text-[#1A96F3] font-medium">Free. Click to generate</span>
                )}
              </div>
            )}

            {errorMessage && (
              <p className="text-[11px] text-red-600">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
