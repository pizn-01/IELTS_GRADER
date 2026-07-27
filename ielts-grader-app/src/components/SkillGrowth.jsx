import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronDown, LineChart as LineChartIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const TASK_OPTIONS = ['Academic Task 1', 'Academic Task 2', 'General Task 1', 'General Task 2'];

const LEGEND_ITEMS = [
  { key: 'overall', label: 'Overall', color: '#EF4444' },
  { key: 'response', label: 'Task Response', color: '#F59E0B' },
  { key: 'coherence', label: 'Coherence', color: '#10B981' },
  { key: 'vocabulary', label: 'Vocabulary', color: '#8B5CF6' },
  { key: 'grammar', label: 'Grammar', color: '#3B82F6' },
];

const cardClass =
  'bg-white/95 backdrop-blur-sm rounded-[16px] border border-[#E5E7EB] shadow-[0_4px_24px_rgba(26,31,54,0.05)] overflow-hidden flex flex-col h-full';

const EmptyChartState = ({ title, description, onStartPractice }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6 px-4">
    <div className="w-12 h-12 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
      <LineChartIcon size={24} strokeWidth={1.75} />
    </div>
    <div className="max-w-sm">
      <p className="text-[14px] font-bold text-[#101828] mb-1">{title}</p>
      <p className="text-[12px] text-[#667085] leading-relaxed">{description}</p>
    </div>
    {onStartPractice && (
      <button
        type="button"
        onClick={onStartPractice}
        className="mt-0.5 h-[38px] px-5 rounded-[10px] bg-[#2C3E50] text-white text-[13px] font-semibold hover:bg-[#1D2939] transition-colors"
      >
        Start practice
      </button>
    )}
  </div>
);

const SkillGrowth = ({
  hasData = true,
  defaultTask = 'Academic Task 2',
  isLoading: parentLoading = false,
  targetBand = null,
  onStartPractice,
}) => {
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

  const isGeneral = activeTask.startsWith('General');

  const taskDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTaskDropdownOpen((open) => !open)}
        className={`flex items-center gap-2 px-3 h-[34px] rounded-[10px] border text-[12px] font-semibold transition-all ${
          isGeneral
            ? 'border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E] hover:bg-[#CCFBF1]'
            : 'border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3] hover:bg-[#D1E9FF]'
        }`}
      >
        <span>{activeTask}</span>
        <ChevronDown size={14} className={`transition-transform ${taskDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      {taskDropdownOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-white rounded-[12px] border border-[#E5E7EB] shadow-xl z-50 py-1 min-w-[180px]">
          {TASK_OPTIONS.map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => handleTaskChange(task)}
              className={`w-full text-left px-3.5 py-2 text-[12px] font-medium hover:bg-[#F8FAFC] transition-colors ${
                activeTask === task ? 'text-[#1A96F3] font-bold' : 'text-[#101828]'
              }`}
            >
              {task}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const sectionHeader = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-[#F2F4F7] shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
          <LineChartIcon size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#101828] leading-tight">Skill Growth</h2>
          <p className="text-[11px] text-[#667085] mt-0.5 truncate">
            Band scores by task type over time
          </p>
        </div>
      </div>
      {taskDropdown}
    </div>
  );

  if (parentLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className={`${cardClass} min-h-[280px] justify-center items-center`}
      >
        <div className="w-7 h-7 border-[3px] border-[#1A96F3] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[#667085] font-medium text-sm">Loading skill growth…</p>
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

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className={cardClass}
      >
        {sectionHeader}
        <EmptyChartState
          title="Your growth chart is waiting"
          description="Complete your first graded practice to see how your scores trend over time."
          onStartPractice={onStartPractice}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className={cardClass}
    >
      {sectionHeader}

      <div className="flex flex-col p-3 md:p-4">
        {loading ? (
          <div className="h-[200px] md:h-[220px] w-full flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-[3px] border-[#1A96F3] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#667085] font-medium text-sm">Loading {activeTask}…</p>
          </div>
        ) : !hasRealData ? (
          <div className="h-[200px] md:h-[220px] w-full flex flex-col items-center justify-center">
            <EmptyChartState
              title={`No attempts for ${activeTask} yet`}
              description="Try this task type in your next practice session to build a trend line."
              onStartPractice={onStartPractice}
            />
          </div>
        ) : (
          <>
            <div className="h-[200px] md:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                    dy={4}
                    height={24}
                  />
                  <YAxis
                    domain={[0, 9]}
                    ticks={[0, 2, 4, 6, 8, 9]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                    dx={-2}
                    tickFormatter={(value) => value.toFixed(1)}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                      padding: '8px 10px',
                      fontSize: '11px',
                      backgroundColor: '#fff',
                    }}
                    cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    formatter={(value) => [Number(value).toFixed(1), undefined]}
                  />
                  {targetBand != null && (
                    <ReferenceLine
                      y={targetBand}
                      stroke="#2C3E50"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: `Goal ${Number(targetBand).toFixed(1)}`,
                        position: 'insideTopRight',
                        fill: '#2C3E50',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Line type="monotone" dataKey="coherence" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="response" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="grammar" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="overall" stroke="#EF4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="vocabulary" stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {LEGEND_ITEMS.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] text-[10px] font-semibold text-[#344054]"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default SkillGrowth;
