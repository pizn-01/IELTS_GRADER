import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, X, Sparkles } from 'lucide-react';

const CRITERIA_SHORT = {
  'Task Response': 'Task Response',
  'Coherence and Cohesion': 'Coherence',
  'Lexical Resource': 'Lexical',
  'Grammatical Range and Accuracy': 'Grammar',
};

export default function LearningEditionModal({ isOpen, edition, priceCents, freeAccess, onDismiss, onView }) {
  const navigate = useNavigate();

  if (!isOpen || !edition) return null;

  const { editionNumber, examRange, preview } = edition;
  const topErrors = preview?.topErrors?.slice(0, 3) || [];
  const focusAreas = Object.entries(preview?.errorsByCriteria || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([crit, count]) => `${CRITERIA_SHORT[crit] || crit} (${count})`);

  const handleView = () => {
    const n = onView?.() ?? editionNumber;
    navigate(n ? `/learning?edition=${n}` : '/learning');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-[20px] shadow-xl border border-gray-100 w-full max-w-[500px] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#1A96F3] shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#1A96F3] uppercase tracking-widest mb-1">
                Personalized Learning
              </p>
              <h2 className="text-[18px] font-bold text-[#101828]">
                Edition {editionNumber} unlocked: Exams {examRange.start}–{examRange.end}
              </h2>
              <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">
                Your custom study guide is ready to build from your last 5 graded exams.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {preview?.avgBands?.overall != null && (
            <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Avg overall (this edition)</span>
              <span className="text-[18px] font-bold text-[#101828]">{preview.avgBands.overall.toFixed(1)}</span>
            </div>
          )}

          {focusAreas.length > 0 && (
            <ul className="text-[13px] text-[#344054] space-y-1.5">
              <li className="font-semibold text-[#101828]">Top focus areas:</li>
              {focusAreas.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A96F3] shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          )}

          {topErrors.length > 0 && (
            <ul className="text-[13px] text-[#667085] space-y-1">
              {topErrors.map((e) => (
                <li key={e.label}>• {e.label} (×{e.count})</li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 h-[46px] rounded-[10px] border border-gray-200 text-[14px] font-medium text-[#344054] hover:bg-gray-50"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={handleView}
              className="flex-1 h-[46px] rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939] flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              View guide
              {!freeAccess && priceCents ? ` ($${(priceCents / 100).toFixed(0)})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
