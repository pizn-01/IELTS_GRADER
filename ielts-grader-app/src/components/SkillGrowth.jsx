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

const cardClass = 'bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6 md:p-8 overflow-hidden';

const EmptyChartState = ({ title, description, onStartPractice }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
    <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
      <LineChartIcon size={28} strokeWidth={1.75} />
    </div>
    <div className="max-w-sm px-4">
      <p className="text-[15px] font-bold text-[#101828] mb-1">{title}</p>
      <p className="text-[13px] text-[#667085] leading-relaxed">{description}</p>
    </div>
    {onStartPractice && (
      <button
        type="button"
        onClick={onStartPractice}
        className="mt-1 h-[40px] px-5 rounded-[10px] bg-[#2C3E50] text-white text-[13px] font-semibold hover:bg-[#1D2939] transition-colors"
      >
        Start practice
      </button>
    )}
  </div>
);

const SkillGrowth = ({
  hasData = true,
  defaultTask = 'Academic Task 2',
  controlledTask = null,
  hideTaskSelector = false,
  isLoading: parentLoading = false,
  targetBand = null,
  onStartPractice,
}) => {
  const [internalTask, setInternalTask] = useState(
    TASK_OPTIONS.includes(defaultTask) ? defaultTask : 'Academic Task 2'
  );
  const activeTask = controlledTask && TASK_OPTIONS.includes(controlledTask)
    ? controlledTask
    : internalTask;
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);

  useEffect(() => {
    if (!controlledTask && TASK_OPTIONS.includes(defaultTask)) {
      setInternalTask(defaultTask);
    }
  }, [defaultTask, controlledTask]);

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
    setInternalTask(task);
    setTaskDropdownOpen(false);
  };

  const taskDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTaskDropdownOpen((open) => !open)}
        className="flex items-center gap-2 px-3 h-[36px] rounded-[10px] border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#344054] hover:bg-[#F8FAFC] transition-all"
      >
        <span>{activeTask}</span>
        <ChevronDown size={16} className={`transition-transform ${taskDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      {taskDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-[12px] border border-[#E5E7EB] shadow-xl z-50 py-1 min-w-[180px]">
          {TASK_OPTIONS.map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => handleTaskChange(task)}
              className={`w-full text-left px-4 py-2.5 text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors ${activeTask === task ? 'text-[#1A96F3] font-bold' : 'text-[#101828]'}`}
            >
              {task}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const sectionHeader = (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0 mt-0.5">
          <LineChartIcon size={18} />
        </div>
        <div>
          <h2 className="text-[17px] font-bold text-[#101828]">Skill Growth</h2>
          <p className="text-[13px] text-[#667085] mt-0.5 max-w-[480px]">
            Track how your band scores evolve for each task type.
          </p>
        </div>
      </div>
      {!hideTaskSelector && taskDropdown}
    </div>
  );

  if (parentLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${cardClass} min-h-[360px] flex flex-col justify-center items-center`}
      >
        <div className="w-8 h-8 border-[3px] border-[#1A96F3] border-t-transparent rounded-full animate-spin mb-4" />
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
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={`${cardClass} min-h-[360px] flex flex-col`}
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cardClass}
    >
      {sectionHeader}

      {loading ? (
        <div className="h-[280px] md:h-[340px] w-full flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-[3px] border-[#1A96F3] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#667085] font-medium text-sm">Loading {activeTask}…</p>
        </div>
      ) : !hasRealData ? (
        <div className="h-[280px] md:h-[340px] w-full flex flex-col items-center justify-center">
          <EmptyChartState
            title={`No attempts for ${activeTask} yet`}
            description="Try this task type in your next practice session to build a trend line."
            onStartPractice={onStartPractice}
          />
        </div>
      ) : (
        <>
          <div className="h-[280px] md:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  dy={4}
                  height={28}
                />
                <YAxis
                  domain={[0, 9]}
                  ticks={[0, 2, 4, 6, 8, 9]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  dx={-4}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                    padding: '10px 12px',
                    fontSize: '12px',
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

          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {LEGEND_ITEMS.map((item) => (
              <span
                key={item.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] text-[11px] font-semibold text-[#344054]"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default SkillGrowth;
