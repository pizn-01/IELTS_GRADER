import { FileText, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ScoreBadge = ({ score }) => {
  const s = parseFloat(score);
  const color = s >= 7 ? '#30C3A9' : s >= 6 ? '#F59E0B' : '#EF4444';
  return (
    <div
      className="w-[52px] h-[26px] flex items-center justify-center rounded-full text-[13px] font-bold border leading-none shrink-0"
      style={{ backgroundColor: color + '1A', color, borderColor: color }}
    >
      {isNaN(s) ? '—' : s.toFixed(1)}
    </div>
  );
};

const cardClass = 'bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden';

const RecentReports = ({ hasData = true, dynamicReports = null, onOpenReport, onStartPractice }) => {
  const navigate = useNavigate();
  const isLoaded = dynamicReports !== null;
  const displayReports = (isLoaded && dynamicReports.length > 0) ? dynamicReports : null;
  const reportCount = displayReports?.length ?? 0;

  if (!isLoaded) {
    return (
      <div className={cardClass}>
        <div className="px-6 md:px-8 pt-6 pb-4 border-b border-[#F2F4F7]">
          <h2 className="text-[17px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <div className="p-4 md:p-6 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-[#F2F4F7] rounded-[12px] p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#F2F4F7] rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#F2F4F7] rounded w-32" />
                  <div className="h-3 bg-[#F2F4F7] rounded w-20" />
                </div>
                <div className="h-7 w-14 bg-[#F2F4F7] rounded-full" />
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
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={cardClass}
      >
        <div className="px-6 md:px-8 pt-6 pb-4 border-b border-[#F2F4F7]">
          <h2 className="text-[17px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <div className="min-h-[280px] flex flex-col items-center justify-center text-center gap-4 px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
            <ClipboardList size={28} strokeWidth={1.75} />
          </div>
          <div className="max-w-sm">
            <p className="text-[15px] font-bold text-[#101828] mb-1">No reports yet</p>
            <p className="text-[13px] text-[#667085] leading-relaxed">
              Complete your first practice and your graded reports will appear here.
            </p>
          </div>
          {onStartPractice && (
            <button
              type="button"
              onClick={onStartPractice}
              className="h-[40px] px-5 rounded-[10px] bg-[#2C3E50] text-white text-[13px] font-semibold hover:bg-[#1D2939] transition-colors"
            >
              Start your first practice
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="px-6 md:px-8 pt-6 pb-4 border-b border-[#F2F4F7] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
            <ClipboardList size={18} />
          </div>
          <h2 className="text-[17px] font-bold text-[#101828]">Recent Reports</h2>
        </div>
        <span className="text-[11px] font-bold text-[#667085] bg-[#F2F4F7] px-2.5 py-1 rounded-full">
          {reportCount}
        </span>
      </div>

      <div className="hidden md:grid grid-cols-4 gap-4 px-8 py-3 border-b border-[#F2F4F7] text-[11px] font-bold text-[#667085] uppercase tracking-wider">
        <div className="pl-[56px]">Name</div>
        <div>Last Exam</div>
        <div>Score</div>
        <div>Actions</div>
      </div>

      <div className="p-4 md:p-6 md:pt-3 space-y-2">
        {(displayReports || []).map((report, idx) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            onClick={() => onOpenReport?.(report.id)}
            className="border border-[#E5E7EB] rounded-[14px] cursor-pointer transition-all hover:border-[#B2DDFF] hover:bg-[#F8FAFC] hover:shadow-sm
              p-4 flex flex-col gap-3
              md:p-0 md:py-3.5 md:px-8 md:grid md:grid-cols-4 md:items-center md:gap-4"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="w-10 h-10 bg-[#EFF8FF] text-[#1A96F3] rounded-xl flex items-center justify-center shrink-0 border border-[#B2DDFF]/60">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] text-[#101828] leading-tight truncate">{report.type}</div>
                <div className="text-[12px] font-medium text-[#667085] leading-tight mt-0.5">{report.task}</div>
              </div>
              <div className="md:hidden">
                <ScoreBadge score={report.score} />
              </div>
            </div>

            <div className="text-[13px] font-medium text-[#667085] md:text-[#101828]">{report.date}</div>

            <div className="hidden md:flex items-center">
              <ScoreBadge score={report.score} />
            </div>

            <div className="flex gap-4 md:gap-5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenReport?.(report.id); }}
                className="text-[13px] font-semibold text-[#1A96F3] hover:underline text-left"
              >
                View report
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate('/performance'); }}
                className="text-[13px] font-semibold text-[#667085] hover:text-[#1A96F3] hover:underline text-left"
              >
                Performance
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecentReports;
