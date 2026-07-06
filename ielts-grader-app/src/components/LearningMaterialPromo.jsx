import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, X } from 'lucide-react';
import { api } from '../services/api';

const DISMISS_KEY = 'learning_promo_dismissed';

export default function LearningMaterialPromo() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    api.getLearningStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (dismissed || !status) return null;

  const { maxUnlockedEdition, progressToNextEdition, priceCents } = status;
  const hasUnlocked = maxUnlockedEdition > 0;
  const nearUnlock = progressToNextEdition?.completed >= 3;

  if (!hasUnlocked && !nearUnlock) return null;

  const message = hasUnlocked
    ? `Edition ${maxUnlockedEdition} is ready — preview your error patterns and get a personalized PDF for $${(priceCents / 100).toFixed(0)}.`
    : `${progressToNextEdition.completed} of 5 exams done — unlock your first Personalized Learning guide soon.`;

  return (
    <div className="mt-8 bg-gradient-to-r from-[#EFF6FF] to-[#F0FDF4] border border-[#BFDBFE] rounded-[16px] px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
        <BookOpen size={20} className="text-[#1A96F3]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#101828]">Personalized Learning</p>
        <p className="text-[13px] text-gray-600 mt-0.5">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/learning')}
        className="hidden sm:flex items-center gap-1 text-[13px] font-bold text-[#1A96F3] hover:underline shrink-0"
      >
        View <ChevronRight size={14} />
      </button>
      <button
        type="button"
        onClick={() => navigate('/learning')}
        className="sm:hidden text-[13px] font-bold text-[#1A96F3] shrink-0"
      >
        View
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
        }}
        className="text-gray-400 hover:text-gray-600 shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
