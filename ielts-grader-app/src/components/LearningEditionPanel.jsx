import React from 'react';
import { Download, Loader2, Lock, Sparkles } from 'lucide-react';

const CRITERIA_LABELS = {
  'Task Response': 'TR',
  'Coherence and Cohesion': 'CC',
  'Lexical Resource': 'LR',
  'Grammatical Range and Accuracy': 'GRA',
};

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
}) {
  if (!edition) {
    return (
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-10 text-center text-gray-400 text-[14px]">
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
    <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
        {/* Left: stats */}
        <div className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold text-[#101828]">
              Exams {examRange.start}–{examRange.end}
            </h3>
            <StatusBadge status={status} />
          </div>

          {locked ? (
            <p className="text-[13px] text-gray-400 flex items-center gap-2">
              <Lock size={14} />
              Complete {examsNeeded} more exam{examsNeeded !== 1 ? 's' : ''} to unlock
            </p>
          ) : (
            <>
              {preview?.avgBands && (
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { k: 'overall', label: 'Overall' },
                    { k: 'response', label: 'TR' },
                    { k: 'coherence', label: 'CC' },
                    { k: 'vocabulary', label: 'LR' },
                    { k: 'grammar', label: 'GRA' },
                  ].map(({ k, label }) => (
                    preview.avgBands[k] != null && (
                      <div key={k} className="bg-[#F8FAFC] rounded-lg px-2 py-2 text-center">
                        <p className="text-[9px] text-gray-400 font-semibold">{label}</p>
                        <p className="text-[14px] font-bold text-[#101828]">{preview.avgBands[k].toFixed(1)}</p>
                      </div>
                    )
                  ))}
                </div>
              )}

              {preview?.errorsByCriteria && Object.keys(preview.errorsByCriteria).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(preview.errorsByCriteria).map(([crit, count]) => (
                    <span
                      key={crit}
                      className="text-[11px] bg-[#EFF6FF] text-[#1A96F3] px-2 py-0.5 rounded-full font-medium"
                    >
                      {CRITERIA_LABELS[crit] || crit}: {count}
                    </span>
                  ))}
                </div>
              )}

              {preview?.topErrors?.length > 0 && (
                <ul className="text-[12px] text-gray-600 space-y-1">
                  {preview.topErrors.slice(0, 4).map((e) => (
                    <li key={e.label} className="flex justify-between gap-2">
                      <span className="truncate">{e.label}</span>
                      <span className="text-gray-400 shrink-0">×{e.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Right: CTA */}
        <div className="p-5 md:p-6 flex flex-col justify-center gap-4">
          <p className="text-[13px] text-[#667085] leading-relaxed">
            {locked
              ? 'Every 5 graded exams unlocks a tailored PDF from your real errors and band scores.'
              : 'A teacher-style guide covering Task Response, Coherence, Lexical Resource, and Grammar — built from these 5 exams.'}
          </p>

          {errorMessage && (
            <p className="text-[12px] text-red-600">{errorMessage}</p>
          )}

          {!locked && (
            <div className="flex flex-wrap gap-3">
              {canGenerate && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPurchase(edition.editionNumber)}
                  className="flex items-center gap-2 bg-[#2C3E50] hover:bg-[#1D2939] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl disabled:opacity-60"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {freeAccess ? 'Generate PDF' : `Get PDF — $${(priceCents / 100).toFixed(0)}`}
                </button>
              )}
              {isReady && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDownload(edition.editionNumber)}
                  className="flex items-center gap-2 border border-[#1A96F3] text-[#1A96F3] font-bold text-[13px] px-5 py-2.5 rounded-xl hover:bg-blue-50 disabled:opacity-60"
                >
                  <Download size={15} />
                  Download PDF
                </button>
              )}
              {canRetry && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRetry(edition.editionNumber)}
                  className="flex items-center gap-2 bg-[#2C3E50] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl disabled:opacity-60"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Retry generation
                </button>
              )}
              {isWorking && (
                <span className="flex items-center gap-2 text-[12px] text-amber-600">
                  <Loader2 size={13} className="animate-spin" />
                  Preparing your guide…
                </span>
              )}
            </div>
          )}

          {!locked && !freeAccess && canGenerate && (
            <p className="text-[11px] text-gray-400">One-time ${(priceCents / 100).toFixed(0)} per edition</p>
          )}
          {!locked && freeAccess && (
            <p className="text-[11px] text-[#1A96F3] font-medium">Free admin access</p>
          )}
        </div>
      </div>
    </div>
  );
}
