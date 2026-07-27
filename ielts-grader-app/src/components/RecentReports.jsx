import { ChevronRight, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

const ScoreBadge = ({ score }) => {
  const s = parseFloat(score);
  const color = s >= 7 ? '#30C3A9' : s >= 6 ? '#F59E0B' : '#EF4444';
  return (
    <div
      className="min-w-[44px] h-[22px] px-2 flex items-center justify-center rounded-full text-[12px] font-bold border leading-none shrink-0 tabular-nums"
      style={{ backgroundColor: color + '1A', color, borderColor: color }}
    >
      {isNaN(s) ? '—' : s.toFixed(1)}
    </div>
  );
};

const typeTone = (type) => {
  const isGeneral = String(type || '').toLowerCase().includes('general');
  if (isGeneral) {
    return 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]';
  }
  return 'bg-[#EFF8FF] text-[#1A96F3] border-[#B2DDFF]';
};

const cardClass =
  'bg-white/95 backdrop-blur-sm rounded-[16px] border border-[#E5E7EB] shadow-[0_4px_24px_rgba(26,31,54,0.05)] overflow-hidden flex flex-col h-full';

const RecentReports = ({ hasData = true, dynamicReports = null, onOpenReport, onStartPractice }) => {
  const isLoaded = dynamicReports !== null;
  const displayReports = (isLoaded && dynamicReports.length > 0) ? dynamicReports : null;
  const reportCount = displayReports?.length ?? 0;

  if (!isLoaded) {
    return (
      <div className={cardClass}>
        <div className="px-3.5 pt-3 pb-2.5 border-b border-[#F2F4F7]">
          <h2 className="text-[14px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <div className="p-2 space-y-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-[10px] px-2.5 py-2 animate-pulse flex items-center gap-2.5">
              <div className="h-5 w-14 bg-[#F2F4F7] rounded-md shrink-0" />
              <div className="h-3 bg-[#F2F4F7] rounded flex-1 max-w-[120px]" />
              <div className="h-3 bg-[#F2F4F7] rounded w-16 ml-auto" />
              <div className="h-5 w-10 bg-[#F2F4F7] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasData || (isLoaded && dynamicReports.length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className={cardClass}
      >
        <div className="px-3.5 pt-3 pb-2.5 border-b border-[#F2F4F7] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
            <ClipboardList size={14} />
          </div>
          <h2 className="text-[14px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 px-4 py-6">
          <div className="w-10 h-10 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
            <ClipboardList size={20} strokeWidth={1.75} />
          </div>
          <div className="max-w-sm">
            <p className="text-[13px] font-bold text-[#101828] mb-0.5">No reports yet</p>
            <p className="text-[12px] text-[#667085] leading-relaxed">
              Complete your first practice and your graded reports will appear here.
            </p>
          </div>
          {onStartPractice && (
            <button
              type="button"
              onClick={onStartPractice}
              className="h-[36px] px-4 rounded-[10px] bg-[#2C3E50] text-white text-[12px] font-semibold hover:bg-[#1D2939] transition-colors"
            >
              Start your first practice
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className={cardClass}
    >
      <div className="px-3.5 pt-3 pb-2.5 border-b border-[#F2F4F7] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
            <ClipboardList size={14} />
          </div>
          <h2 className="text-[14px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <span className="text-[10px] font-bold text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full shrink-0">
          {reportCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-1.5 md:p-2">
        {(displayReports || []).map((report, idx) => {
          const tone = typeTone(report.type);
          return (
            <motion.button
              key={report.id}
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.025 }}
              onClick={() => onOpenReport?.(report.id)}
              className="group w-full text-left rounded-[10px] cursor-pointer transition-colors
                hover:bg-[#F8FBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A96F3]/30
                px-2.5 py-2 flex items-center gap-2.5 border border-transparent hover:border-[#E0F2FE]"
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border shrink-0 ${tone}`}
              >
                {report.type}
              </span>

              <span className="text-[12px] font-semibold text-[#344054] shrink-0">
                {report.task}
              </span>

              <span className="text-[11px] font-medium text-[#98A2B3] truncate min-w-0 flex-1">
                {report.date}
              </span>

              <ScoreBadge score={report.score} />

              <ChevronRight
                size={14}
                className="text-[#D0D5DD] group-hover:text-[#1A96F3] shrink-0 transition-colors"
                aria-hidden
              />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecentReports;
