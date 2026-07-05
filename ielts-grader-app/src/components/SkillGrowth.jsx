import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, Frown } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const TASK_OPTIONS = ['Academic Task 1', 'Academic Task 2', 'General Task 1', 'General Task 2'];

const SkillGrowth = ({ hasData = true, defaultTask = 'Academic Task 2', isLoading: parentLoading = false }) => {
  const [activeTask, setActiveTask] = useState(
    TASK_OPTIONS.includes(defaultTask) ? defaultTask : 'Academic Task 2'
  );
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);

  useEffect(() => {
    if (TASK_OPTIONS.includes(defaultTask)) {
      setActiveTask(defaultTask);
    }
  }, [defaultTask]);

  useEffect(() => {
    if (parentLoading) return;

    let cancelled = false;
    setLoading(true);
    api.getDashboardAnalytics({ taskType: activeTask })
      .then((res) => {
        if (!cancelled) setChartData(res.chartData || []);
      })
      .catch(() => {
        if (!cancelled) setChartData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTask, parentLoading]);

  const handleTaskChange = (task) => {
    setActiveTask(task);
    setTaskDropdownOpen(false);
  };

  if (parentLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 md:p-8 overflow-hidden bg-white min-h-[400px] flex flex-col justify-center items-center"
      >
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading skill growth...</p>
      </motion.div>
    );
  }

  const hasRealData = chartData.length > 0;
  const chartSeries = hasRealData
    ? chartData.map((d, i) => ({
        ...d,
        overall: d.overall || 0,
        vocabulary: d.vocabulary || 0,
        grammar: d.grammar || 0,
        response: d.response || 0,
        coherence: d.coherence || 0,
        x: d.x !== undefined ? d.x : i + 1,
      }))
    : [];

  const taskDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTaskDropdownOpen((open) => !open)}
        className="flex items-center gap-2 px-3 h-[36px] rounded-[10px] border border-gray-200 bg-white text-[13px] font-semibold text-[#344054] hover:bg-gray-50 transition-all"
      >
        <span>{activeTask}</span>
        <ChevronDown size={16} className={`transition-transform ${taskDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      {taskDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-[12px] border border-gray-100 shadow-xl z-50 py-1 min-w-[180px]">
          {TASK_OPTIONS.map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => handleTaskChange(task)}
              className={`w-full text-left px-4 py-2.5 text-[13px] font-medium hover:bg-gray-50 transition-colors ${activeTask === task ? 'text-[#1A96F3] font-bold' : 'text-[#101828]'}`}
            >
              {task}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!hasData) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card min-h-[400px] flex flex-col p-6 md:p-8 bg-white"
      >
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a1f36]">Skill Growth</h2>
            <p className="text-sm text-gray-500">Visually map out how your criteria scores have evolved across your attempts.</p>
          </div>
          {taskDropdown}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50">
            <Frown size={32} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">No data to display yet</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="card p-6 md:p-8 overflow-hidden bg-white"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-lg font-bold text-[#1a1f36]">Skill Growth</h2>
          <p className="text-sm text-gray-500 max-w-[500px]">Track how your band scores evolve for each task type separately.</p>
        </div>
        {taskDropdown}
      </div>

      {loading ? (
        <div className="h-[300px] md:h-[400px] w-full flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm">Loading {activeTask}…</p>
        </div>
      ) : !hasRealData ? (
        <div className="h-[300px] md:h-[400px] w-full flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50">
            <Frown size={32} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">No graded attempts for {activeTask} yet</p>
        </div>
      ) : (
      <>
      <div className="h-[300px] md:h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 30 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical horizontal />
            <XAxis
              dataKey="name"
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={{ stroke: '#CBD5E1' }}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              domain={[0, 9]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
              interval={0}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={{ stroke: '#CBD5E1' }}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              dx={-10}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                padding: '10px 12px',
                fontSize: '12px',
                backgroundColor: '#fff',
              }}
              cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(value) => [Number(value).toFixed(1), undefined]}
            />

            <Line type="linear" dataKey="coherence" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
            <Line type="linear" dataKey="response" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
            <Line type="linear" dataKey="grammar" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
            <Line type="linear" dataKey="overall" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3.5, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
            <Line type="linear" dataKey="vocabulary" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-12 flex flex-wrap justify-center gap-x-10 md:gap-x-14 gap-y-4 text-[12px] font-bold text-[#101828]">
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0"></div> Overall Band
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0"></div> Task Response
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0"></div> Coherence
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shrink-0"></div> Vocabulary
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0"></div> Grammar
         </div>
      </div>
      </>
      )}
    </motion.div>
  );
};

export default SkillGrowth;
