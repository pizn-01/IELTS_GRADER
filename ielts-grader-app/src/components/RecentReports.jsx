import { FileText, Frown } from 'lucide-react';
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

const RecentReports = ({ hasData = true, dynamicReports = null, onOpenReport }) => {
  const navigate = useNavigate();
  const isLoaded = dynamicReports !== null;
  const displayReports = (isLoaded && dynamicReports.length > 0) ? dynamicReports : null;

  // Loading skeleton
  if (!isLoaded) {
    return (
      <div className="mt-10">
        <h2 className="text-lg font-bold mb-6">Recent Reports</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-[12px] p-4 md:py-3 md:px-8 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
                <div className="h-7 w-14 bg-gray-100 rounded-full" />
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
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-10"
      >
        <h2 className="text-lg font-bold mb-6">Recent Reports</h2>
        <div className="card min-h-[400px] flex flex-col items-center justify-center text-gray-400 gap-4 bg-white">
          <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 mb-2">
            <Frown size={32} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-bold text-gray-700 mb-1">No Reports Yet.</p>
            <p className="text-sm font-medium text-gray-400">Take your first exam and track your history here.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-bold mb-4">Reports</h2>

      {/* Desktop header row */}
      <div
        style={{ backgroundColor: '#f3f3f4' }}
        className="hidden md:grid rounded-[10px] p-4 grid-cols-4 items-center mb-2 px-8 border border-transparent"
      >
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none pl-[56px]">Name</div>
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none">Last Exam</div>
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none">Score</div>
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none">Actions</div>
      </div>

      <div className="space-y-3 relative z-10">
        {(displayReports || []).map((report, idx) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            onClick={() => onOpenReport?.(report.id)}
            className="bg-white border border-gray-100 rounded-[12px] md:rounded-[10px] shadow-sm md:shadow-none cursor-pointer transition-all hover:bg-gray-50 hover:shadow-md
              /* mobile */ p-4 flex flex-col gap-3
              /* desktop */ md:p-0 md:py-3 md:px-8 md:grid md:grid-cols-4 md:items-center md:gap-0"
          >
            {/* ── MOBILE: row 1 — icon + name/task + score ── */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 bg-blue-50 text-[#1A96F3] rounded-lg flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px] text-[#101828] leading-tight truncate">{report.type}</div>
                <div className="text-[13px] font-medium text-[#667085] leading-tight">{report.task}</div>
              </div>
              {/* Score badge — visible on mobile only, inline with name */}
              <div className="md:hidden">
                <ScoreBadge score={report.score} />
              </div>
            </div>

            {/* ── MOBILE: row 2 — date ── */}
            <div className="md:block">
              <div className="text-[13px] font-semibold text-[#667085] md:text-[14px] md:text-[#101828]">{report.date}</div>
            </div>

            {/* ── DESKTOP only score column ── */}
            <div className="hidden md:flex items-center">
              <ScoreBadge score={report.score} />
            </div>

            {/* ── Actions row ── */}
            <div className="flex gap-5 md:gap-6">
              <button
                onClick={(e) => { e.stopPropagation(); onOpenReport?.(report.id); }}
                className="text-[13px] md:text-[16px] font-semibold text-[#1A96F3] hover:underline text-left leading-none"
              >
                View History
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/performance'); }}
                className="text-[13px] md:text-[16px] font-semibold text-[#1A96F3] hover:underline text-left leading-none"
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
