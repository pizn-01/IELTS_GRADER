import React, { useMemo, useState } from 'react';
import { CheckCircle, ChevronDown, XCircle } from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'response', label: 'Task Response', match: /task\s*response|task\s*achievement/i },
  { id: 'coherence', label: 'Coherence', match: /coherence|cohesion/i },
  { id: 'vocabulary', label: 'Vocabulary', match: /lexical|vocabulary/i },
  { id: 'grammar', label: 'Grammar', match: /grammar|grammatical/i },
];

function matchesCriterion(criteria, filter) {
  if (!filter || filter.id === 'all') return true;
  if (!criteria) return false;
  return filter.match.test(criteria);
}

function impactStyles(item) {
  const isHigh = item.type === 'red' || item.impact === 'High Impact';
  const isMed = !isHigh && (item.type === 'yellow' || item.impact === 'Medium Impact');
  if (isHigh) {
    return {
      badge: 'text-[#EA4335] bg-[#EA43351A]',
      label: 'High Impact',
    };
  }
  if (isMed) {
    return {
      badge: 'text-[#F59E0B] bg-[#F59E0B1A]',
      label: 'Medium Impact',
    };
  }
  return {
    badge: 'text-[#101828] bg-[#1018280D]',
    label: 'Low Impact',
  };
}

function FixCard({ item, index, expanded, onToggle }) {
  const styles = impactStyles(item);
  const sample = item.sample;
  const hasSample = sample && (sample.original_text || sample.correction_text || sample.explanation);
  const examCount = item.examCount ?? null;
  const latestExam = sample?.examIndex;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden hover:shadow-md transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 md:p-5 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[12px] font-bold text-[#9CA3AF]">#{index}</span>
              <h4
                className="text-[14px] md:text-[16px] font-bold text-[#101828] leading-snug"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {item.label}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.criteria && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  {item.criteria}
                  {item.sub_category ? ` → ${item.sub_category}` : ''}
                </span>
              )}
              {examCount != null && examCount > 0 && (
                <span className="text-[11px] text-[#667085] font-medium">
                  Seen across {examCount} exam{examCount !== 1 ? 's' : ''}
                  {latestExam != null ? ` · latest Exam ${latestExam}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-bold whitespace-nowrap ${styles.badge}`}
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {styles.label}
            </span>
            <span
              className="px-3 py-1.5 bg-[#1018280D] rounded-full text-[12px] md:text-[13px] font-bold text-[#101828] whitespace-nowrap"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              ×{item.count}
            </span>
            <ChevronDown
              size={18}
              className={`text-[#667085] transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-[#F2F4F7] pt-4">
          {hasSample ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="bg-[#FEF2F2] rounded-[10px] p-4">
                  <p className="text-[11px] font-bold text-[#DC2626] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle size={12} /> Original
                  </p>
                  <p className="text-[13px] text-[#7F1D1D] font-medium leading-relaxed italic">
                    {sample.original_text ? `"${sample.original_text}"` : '—'}
                  </p>
                </div>
                <div className="bg-[#F0FDF4] rounded-[10px] p-4">
                  <p className="text-[11px] font-bold text-[#16A34A] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} /> Correction
                  </p>
                  <p className="text-[13px] text-[#14532D] font-medium leading-relaxed">
                    {sample.correction_text || '—'}
                  </p>
                </div>
              </div>
              {sample.explanation && (
                <p className="text-[13px] text-[#475467] leading-relaxed">
                  <span className="font-semibold text-[#101828]">{item.label}: </span>
                  {sample.explanation}
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#667085]">
              No rewrite sample stored for this pattern yet. Open a graded report to see full Error Analysis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PerformanceFixCards({
  frequentErrors = [],
  bottleneckCrit = null,
  loading = false,
}) {
  const [filterId, setFilterId] = useState('all');
  const [expandedKey, setExpandedKey] = useState(null);

  const activeFilter = FILTERS.find((f) => f.id === filterId) || FILTERS[0];

  const filtered = useMemo(() => {
    return frequentErrors.filter((e) => matchesCriterion(e.criteria, activeFilter));
  }, [frequentErrors, activeFilter]);

  const focusLine =
    bottleneckCrit?.name && bottleneckCrit.avg != null
      ? `Primary focus: patterns hurting ${bottleneckCrit.name} (avg ${bottleneckCrit.avg.toFixed(1)}).`
      : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="px-4 md:px-8 py-4 md:py-5 border-b border-[#F2F4F7]">
          <h3
            className="text-[18px] font-bold text-[#101828]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Fix Cards: Error Patterns
          </h3>
          <p
            className="text-[14px] text-[#475467] mt-0.5"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Recurring mistakes across your exams — with rewrite samples so you know exactly what to fix.
          </p>
          {focusLine && (
            <p className="text-[13px] text-[#175CD3] font-medium mt-2">{focusLine}</p>
          )}
        </div>

        <div className="px-4 md:px-8 pt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filterId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilterId(f.id);
                  setExpandedKey(null);
                }}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                  active
                    ? 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]'
                    : 'bg-white text-[#667085] border-[#E5E7EB] hover:border-[#D0D5DD] hover:text-[#101828]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 md:p-8 space-y-3 md:space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#1A96F3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[14px] text-gray-400 text-center py-8">
              {frequentErrors.length === 0
                ? 'Complete more exams to generate your Fix Cards.'
                : 'No patterns match this criterion filter.'}
            </p>
          ) : (
            filtered.map((item, idx) => {
              const key = item.label || String(idx);
              return (
                <FixCard
                  key={key}
                  item={item}
                  index={idx + 1}
                  expanded={expandedKey === key}
                  onToggle={() => setExpandedKey((prev) => (prev === key ? null : key))}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
