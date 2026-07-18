import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Loader2, AlertCircle, Lock } from 'lucide-react';
import { api } from '../services/api';
import LearningEditionPanel from '../components/LearningEditionPanel';

export default function PersonalizedLearningPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyEdition, setBusyEdition] = useState(null);
  const [selectedEdition, setSelectedEdition] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const status = await api.getLearningStatus();
      setData(status);
      setError(null);
      return status;
    } catch (err) {
      setError(err.message || 'Failed to load learning status.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!data?.editions?.length) return;
    const fromUrl = parseInt(searchParams.get('edition'), 10);
    const valid = data.editions.find((e) => e.editionNumber === fromUrl && e.unlocked);
    const latest = data.editions.filter((e) => e.unlocked).pop();
    setSelectedEdition((prev) => {
      if (valid) return valid.editionNumber;
      if (prev && data.editions.some((e) => e.editionNumber === prev && e.unlocked)) return prev;
      return latest?.editionNumber ?? data.editions[0].editionNumber;
    });
  }, [data, searchParams]);

  useEffect(() => {
    const generating = data?.editions?.some(
      (e) => e.status === 'generating' || e.status === 'pending_payment',
    );
    if (!generating) return undefined;
    const id = setInterval(loadStatus, 5000);
    return () => clearInterval(id);
  }, [data, loadStatus]);

  useEffect(() => {
    if (searchParams.get('session_id')) loadStatus();
  }, [searchParams, loadStatus]);

  const unlockedEditions = useMemo(
    () => (data?.editions || []).filter((e) => e.unlocked),
    [data],
  );

  const activeEdition = useMemo(
    () => (data?.editions || []).find((e) => e.editionNumber === selectedEdition) || null,
    [data, selectedEdition],
  );

  const progress = data?.progressToNextEdition;

  const handlePurchase = async (editionNumber) => {
    setBusyEdition(editionNumber);
    try {
      const result = await api.createLearningCheckout(editionNumber);
      if (result.url) window.location.href = result.url;
      else if (result.status === 'generating') await loadStatus();
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
      const result = await api.createLearningCheckout(editionNumber);
      if (result.url) window.location.href = result.url;
      else await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyEdition(null);
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-y-auto lg:overflow-hidden">
      {/* Hero — compact */}
      <div className="relative overflow-hidden border-b border-[#E5E7EB]/60 shrink-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #E0F2FE 0%, #FCE7F3 40%, #FCE7F3 60%, #CFFAFE 100%)',
            opacity: 0.75,
          }}
        />
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[#1A96F3] uppercase tracking-widest mb-0.5 flex items-center gap-2">
                <BookOpen size={13} />
                Personalized Learning
              </p>
              <h1 className="text-[20px] md:text-[22px] font-bold text-[#101828] tracking-tight leading-tight">
                Your custom study guides
              </h1>
              <p className="text-[#667085] text-[12px] mt-0.5">
                {data?.totalGraded || 0} graded exams
                {data?.freeAccess ? ' · Free' : ` · $${(data?.priceCents || 500) / 100} per edition`}
              </p>
            </div>
            {progress && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[180px] border border-white/60 shrink-0">
                <div className="flex justify-between text-[10px] text-[#667085] mb-1">
                  <span>Next edition</span>
                  <span className="font-bold text-[#101828]">{progress.completed}/{progress.required}</span>
                </div>
                <div className="h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1A96F3] rounded-full transition-all"
                    style={{ width: `${(progress.completed / progress.required) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full px-4 md:px-6 py-3 min-h-0 lg:overflow-hidden">
        {error && (
          <div className="mb-2 shrink-0 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-3 py-2 text-[12px]">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 justify-center items-center">
            <Loader2 size={28} className="animate-spin text-[#1A96F3]" />
          </div>
        ) : data?.maxUnlockedEdition === 0 ? (
          <div className="bg-[#F4F6F8] rounded-[24px] border border-[#E5E7EB]/80 p-8 text-center flex-1 flex flex-col items-center justify-center">
            <Lock className="text-gray-300 mb-2" size={24} />
            <p className="text-[15px] font-bold text-[#101828]">Complete 5 graded exams to unlock Edition 1</p>
            <p className="text-gray-400 text-[12px] mt-1">All task types count toward your progress.</p>
          </div>
        ) : (
          <div className="bg-[#F4F6F8] rounded-[20px] border border-[#E5E7EB]/80 p-3 md:p-4 flex flex-col flex-1 min-h-0 gap-3 lg:overflow-hidden">
            {/* Edition pills */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {unlockedEditions.map((ed) => (
                <button
                  key={ed.editionNumber}
                  type="button"
                  onClick={() => setSelectedEdition(ed.editionNumber)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    selectedEdition === ed.editionNumber
                      ? 'bg-[#2C3E50] text-white shadow-sm'
                      : 'bg-white text-[#344054] border border-[#E5E7EB] hover:border-[#1A96F3]'
                  }`}
                >
                  Edition {ed.editionNumber}
                  {ed.status === 'ready' && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </button>
              ))}
            </div>

            <LearningEditionPanel
              className="flex-1 min-h-0"
              edition={activeEdition}
              freeAccess={data?.freeAccess}
              priceCents={data?.priceCents}
              busy={busyEdition === activeEdition?.editionNumber}
              onPurchase={handlePurchase}
              onDownload={handleDownload}
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>
    </div>
  );
}
