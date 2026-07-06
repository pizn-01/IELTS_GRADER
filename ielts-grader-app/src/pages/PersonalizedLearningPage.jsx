import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen, Download, Loader2, Lock, CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

const CRITERIA_LABELS = {
  'Task Response': 'Task Response',
  'Coherence and Cohesion': 'Coherence',
  'Lexical Resource': 'Lexical',
  'Grammatical Range and Accuracy': 'Grammar',
};

function StatusBadge({ status }) {
  const map = {
    locked: { label: 'Locked', className: 'bg-gray-100 text-gray-600' },
    preview: { label: 'Preview ready', className: 'bg-blue-50 text-blue-700' },
    pending_payment: { label: 'Processing payment', className: 'bg-amber-50 text-amber-700' },
    generating: { label: 'Generating PDF', className: 'bg-amber-50 text-amber-700' },
    ready: { label: 'Ready', className: 'bg-green-50 text-green-700' },
    failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
  };
  const cfg = map[status] || map.preview;
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function EditionCard({
  edition,
  onPurchase,
  onDownload,
  onRetry,
  busy,
}) {
  const { editionNumber, examRange, status, preview, examsNeeded, priceCents } = edition;
  const canBuy = status === 'preview' || status === 'failed';
  const isReady = status === 'ready';
  const isWorking = status === 'generating' || status === 'pending_payment';

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Edition {editionNumber}</p>
          <h3 className="text-[18px] font-bold text-[#101828] mt-1">
            Exams {examRange.start}–{examRange.end}
          </h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {preview?.avgBands && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { k: 'overall', label: 'Overall' },
            { k: 'response', label: 'TR' },
            { k: 'coherence', label: 'CC' },
            { k: 'vocabulary', label: 'LR' },
            { k: 'grammar', label: 'GRA' },
          ].map(({ k, label }) => (
            preview.avgBands[k] != null && (
              <div key={k} className="bg-[#F8FAFC] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
                <p className="text-[15px] font-bold text-[#101828]">{preview.avgBands[k].toFixed(1)}</p>
              </div>
            )
          ))}
        </div>
      )}

      {preview?.errorsByCriteria && Object.keys(preview.errorsByCriteria).length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-gray-500 mb-2">Error focus areas</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(preview.errorsByCriteria).map(([crit, count]) => (
              <span
                key={crit}
                className="text-[12px] bg-[#EFF6FF] text-[#1A96F3] px-3 py-1 rounded-full font-medium"
              >
                {CRITERIA_LABELS[crit] || crit}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {preview?.topErrors?.length > 0 && (
        <ul className="text-[13px] text-gray-600 space-y-1.5">
          {preview.topErrors.slice(0, 4).map((e) => (
            <li key={e.label} className="flex justify-between gap-2">
              <span className="truncate">{e.label}</span>
              <span className="font-semibold text-gray-400 shrink-0">×{e.count}</span>
            </li>
          ))}
        </ul>
      )}

      {examsNeeded > 0 && (
        <p className="text-[13px] text-gray-400 flex items-center gap-2">
          <Lock size={14} />
          Complete {examsNeeded} more graded exam{examsNeeded !== 1 ? 's' : ''} to unlock
        </p>
      )}

      <div className="flex flex-wrap gap-3 mt-auto pt-2">
        {canBuy && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPurchase(editionNumber)}
            className="flex items-center gap-2 bg-[#1A96F3] hover:bg-[#1585d8] text-white font-bold text-[14px] px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Get PDF — ${(priceCents / 100).toFixed(0)}
          </button>
        )}
        {isReady && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDownload(editionNumber)}
            className="flex items-center gap-2 border border-[#1A96F3] text-[#1A96F3] font-bold text-[14px] px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-60"
          >
            <Download size={16} />
            Download PDF
          </button>
        )}
        {status === 'failed' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRetry(editionNumber)}
            className="text-[13px] text-gray-500 underline"
          >
            Retry generation
          </button>
        )}
        {isWorking && (
          <span className="flex items-center gap-2 text-[13px] text-amber-600">
            <Loader2 size={14} className="animate-spin" />
            Your guide is being prepared…
          </span>
        )}
      </div>
    </div>
  );
}

export default function PersonalizedLearningPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyEdition, setBusyEdition] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const status = await api.getLearningStatus();
      setData(status);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load learning status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Poll while any edition is generating
  useEffect(() => {
    const generating = data?.editions?.some(
      (e) => e.status === 'generating' || e.status === 'pending_payment'
    );
    if (!generating) return undefined;
    const id = setInterval(loadStatus, 5000);
    return () => clearInterval(id);
  }, [data, loadStatus]);

  // Return from Stripe checkout
  useEffect(() => {
    if (searchParams.get('session_id')) {
      loadStatus();
    }
  }, [searchParams, loadStatus]);

  const handlePurchase = async (editionNumber) => {
    setBusyEdition(editionNumber);
    try {
      const { url } = await api.createLearningCheckout(editionNumber);
      if (url) window.location.href = url;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyEdition(null);
    }
  };

  const handleDownload = async (editionNumber) => {
    setBusyEdition(editionNumber);
    try {
      const { url } = await api.getLearningDownloadUrl(editionNumber);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyEdition(null);
    }
  };

  const handleRetry = async (editionNumber) => {
    setBusyEdition(editionNumber);
    try {
      await api.retryLearningGeneration(editionNumber);
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyEdition(null);
    }
  };

  const progress = data?.progressToNextEdition;

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <div className="max-w-[900px] mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        <div className="bg-gradient-to-br from-[#1A365D] via-[#2C5282] to-[#1A96F3] rounded-[24px] p-8 md:p-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-widest text-white/70">
              Personalized Learning
            </span>
          </div>
          <h1 className="text-[28px] md:text-[34px] font-bold leading-tight mb-3">
            Your custom study guide
          </h1>
          <p className="text-white/80 text-[15px] max-w-xl leading-relaxed">
            Every 5 graded exams, unlock a tailored PDF covering Task Response, Coherence,
            Lexical Resource, and Grammar — built from your real errors and band scores.
          </p>
          {progress && (
            <div className="mt-6 bg-white/10 rounded-2xl p-4">
              <div className="flex justify-between text-[13px] mb-2">
                <span>Progress to Edition {progress.editionNumber}</span>
                <span className="font-bold">{progress.completed}/{progress.required} exams</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${(progress.completed / progress.required) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-[14px]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#1A96F3]" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[14px] text-gray-500">
              <CheckCircle2 size={16} className="text-green-500" />
              {data?.totalGraded || 0} graded exams · ${(data?.priceCents || 500) / 100} per edition
            </div>

            <div className="grid gap-5">
              {(data?.editions || []).map((edition) => (
                <EditionCard
                  key={edition.editionNumber}
                  edition={edition}
                  onPurchase={handlePurchase}
                  onDownload={handleDownload}
                  onRetry={handleRetry}
                  busy={busyEdition === edition.editionNumber}
                />
              ))}
            </div>

            {data?.maxUnlockedEdition === 0 && (
              <div className="bg-white rounded-[20px] border border-gray-100 p-8 text-center">
                <Lock className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="text-[16px] font-bold text-[#101828]">Complete 5 graded exams to unlock Edition 1</p>
                <p className="text-gray-400 text-[14px] mt-2">
                  All task types count toward your progress.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
