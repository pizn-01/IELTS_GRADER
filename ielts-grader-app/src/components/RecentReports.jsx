import { FileText, Frown } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultReports = [
  { id: 1, type: 'Academic', task: 'Task 1', date: 'Mar 23, 2026', score: 7.0 },
  { id: 2, type: 'Academic', task: 'Task 2', date: 'Mar 18, 2026', score: 7.5 },
  { id: 3, type: 'General', task: 'Task 1', date: 'Mar 21, 2026', score: 6.5 },
  { id: 4, type: 'General', task: 'Task 2', date: 'Mar 15, 2026', score: 6.0 },
];

const RecentReports = ({ hasData = true, dynamicReports = null }) => {
  const displayReports = dynamicReports?.length > 0 ? dynamicReports : defaultReports;

  if (!hasData) {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className="mt-10 overflow-hidden"
    >
      <h2 className="text-lg font-bold mb-6">Reports</h2>
      
      {/* Desktop Header */}
      <div 
        style={{ backgroundColor: '#f3f3f4' }}
        className="hidden md:grid rounded-[10px] p-4 grid-cols-4 items-center mb-2 px-8 border border-transparent"
      >
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none pl-[56px]">Name</div>
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none">Last Exam</div>
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none">Score</div>
        <div className="text-[16px] font-semibold text-[#101828] font-sans leading-none text-right pr-4">Actions</div>
      </div>
      
      <div className="space-y-3">
        {displayReports.map((report, idx) => (
          <motion.div 
            variants={itemVariants}
            key={report.id} 
            className="bg-white border border-gray-100 rounded-[12px] md:rounded-[10px] p-4 md:py-3 md:px-8 flex flex-col md:grid md:grid-cols-4 md:items-center gap-4 md:gap-0 transition-all hover:bg-gray-50 hover:shadow-md shadow-sm md:shadow-none"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-[#1A96F3] rounded-lg flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[20px] text-[#101828] font-sans leading-none mb-1">{report.type}</div>
                <div className="text-[16px] font-medium text-[#101828] font-sans leading-none">{report.task}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:block">
              <div className="text-[14px] font-semibold text-[#101828] font-sans leading-none">{report.date}</div>
            </div>
            
            <div className="flex items-center justify-center md:justify-start">
              <div className={`w-[54px] h-[28px] flex items-center justify-center rounded-full text-[14px] font-bold border font-sans leading-none ${
                idx < 2 ? 'bg-[#30C3A91A] text-[#30C3A9] border-[#30C3A9]' : 
                'bg-[#F59E0B1A] text-[#F59E0B] border-[#F59E0B]'
              }`}>
                {report.score.toFixed(1)}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-gray-50 md:justify-end">
              <button className="text-[16px] font-semibold leading-[20px] text-[#1A96F3] font-sans hover:underline text-left">View Exam History</button>
              <button className="text-[16px] font-semibold leading-[20px] text-[#1A96F3] font-sans hover:underline text-left">View Performance</button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentReports;
