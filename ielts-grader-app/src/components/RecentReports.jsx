import { FileText, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ScoreBadge = ({ score }) => {
  const s = parseFloat(score);
  const color = s >= 7 ? '#30C3A9' : s >= 6 ? '#F59E0B' : '#EF4444';
  return (
    <div
      className="w-[48px] h-[24px] flex items-center justify-center rounded-full text-[12px] font-bold border leading-none shrink-0"
      style={{ backgroundColor: color + '1A', color, borderColor: color }}
    >
      {isNaN(s) ? '—' : s.toFixed(1)}
    </div>
  );
};

const typeTone = (type) => {
  const isGeneral = String(type || '').toLowerCase().includes('general');
  if (isGeneral) {
    return {
      iconWrap: 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]',
    };
  }
  return {
    iconWrap: 'bg-[#EFF8FF] text-[#1A96F3] border-[#B2DDFF]',
  };
};

const cardClass =
  'bg-white/95 backdrop-blur-sm rounded-[16px] border border-[#E5E7EB] shadow-[0_4px_24px_rgba(26,31,54,0.05)] overflow-hidden flex flex-col h-full';

const RecentReports = ({ hasData = true, dynamicReports = null, onOpenReport, onStartPractice }) => {
  const navigate = useNavigate();
  const isLoaded = dynamicReports !== null;
  const displayReports = (isLoaded && dynamicReports.length > 0) ? dynamicReports : null;
  const reportCount = displayReports?.length ?? 0;

  if (!isLoaded) {
    return (
      <div className={cardClass}>
        <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F7]">
          <h2 className="text-[15px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-[#F2F4F7] rounded-[12px] p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F2F4F7] rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-[#F2F4F7] rounded w-28" />
                  <div className="h-2.5 bg-[#F2F4F7] rounded w-16" />
                </div>
                <div className="h-6 w-12 bg-[#F2F4F7] rounded-full" />
              </div>
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
        <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F7] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
            <ClipboardList size={16} />
          </div>
          <h2 className="text-[15px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4 py-8">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
            <ClipboardList size={24} strokeWidth={1.75} />
          </div>
          <div className="max-w-sm">
            <p className="text-[14px] font-bold text-[#101828] mb-1">No reports yet</p>
            <p className="text-[12px] text-[#667085] leading-relaxed">
              Complete your first practice and your graded reports will appear here.
            </p>
          </div>
          {onStartPractice && (
            <button
              type="button"
              onClick={onStartPractice}
              className="h-[38px] px-5 rounded-[10px] bg-[#2C3E50] text-white text-[13px] font-semibold hover:bg-[#1D2939] transition-colors"
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
      <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F7] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
            <ClipboardList size={16} />
          </div>
          <h2 className="text-[15px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <span className="text-[11px] font-bold text-[#667085] bg-[#F2F4F7] px-2.5 py-1 rounded-full shrink-0">
          {reportCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[340px] lg:max-h-[380px] p-2.5 md:p-3 space-y-1.5">
        {(displayReports || []).map((report, idx) => {
          const tone = typeTone(report.type);
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03 }}
              onClick={() => onOpenReport?.(report.id)}
              className="group border border-[#E5E7EB] rounded-[12px] cursor-pointer transition-all
                hover:border-[#B2DDFF] hover:bg-[#F8FBFF] hover:shadow-sm hover:-translate-y-px
                px-3 py-2.5 flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${tone.iconWrap}`}
              >
                <FileText size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[13px] text-[#101828] leading-tight truncate">
                    {report.type}
                  </span>
                  <span className="text-[11px] font-medium text-[#667085] shrink-0">{report.task}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-medium text-[#667085]">{report.date}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenReport?.(report.id); }}
                    className="text-[11px] font-semibold text-[#1A96F3] hover:underline"
                  >
                    View report
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate('/performance'); }}
                    className="text-[11px] font-semibold text-[#667085] hover:text-[#1A96F3] hover:underline"
                  >
                    Performance
                  </button>
                </div>
              </div>

              <ScoreBadge score={report.score} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecentReports;
