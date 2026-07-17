import React, { useMemo, useState, useEffect } from 'react';
import { CalendarDays, Clock, Target, ClipboardList, Play, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildSprintPlan } from '../utils/buildSprintPlan';
import {
  loadSprint,
  startSprint,
  clearSprint,
  sprintDayNumber,
  isSprintActive,
  isSprintComplete,
} from '../utils/sprintStorage';

const PHASE_STYLES = {
  Audit: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  Drill: 'bg-[#FFF7ED] text-[#C4320A] border-[#FED7AA]',
  Write: 'bg-[#F0FDF9] text-[#047857] border-[#A7F3D0]',
  Combine: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
  Review: 'bg-[#F2F4F7] text-[#344054] border-[#E4E7EC]',
  Criterion: 'bg-[#FFF1F3] text-[#C01048] border-[#FECDD6]',
  Rewrite: 'bg-[#FFFAEB] text-[#B54708] border-[#FEF0C7]',
  Mock: 'bg-[#1D2939] text-white border-[#344054]',
};

function impactChipClass(error) {
  const isHigh = error?.type === 'red' || error?.impact === 'High Impact';
  const isMed = !isHigh && (error?.type === 'yellow' || error?.impact === 'Medium Impact');
  if (isHigh) return 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]';
  if (isMed) return 'bg-[#FFFAEB] text-[#B54708] border-[#FEF0C7]';
  return 'bg-[#F2F4F7] text-[#475467] border-[#E4E7EC]';
}

function DayCard({ dayPlan, index, isCurrentDay }) {
  const phaseClass = PHASE_STYLES[dayPlan.phase] || PHASE_STYLES.Drill;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={`bg-white rounded-[16px] border overflow-hidden hover:shadow-sm transition-all flex flex-col ${
        isCurrentDay
          ? 'border-[#1A96F3] ring-2 ring-[#1A96F3]/20 shadow-sm'
          : 'border-[#E5E7EB] hover:border-[#B2DDFF]'
      }`}
    >
      <div className="px-5 pt-5 pb-4 border-b border-[#F2F4F7] flex flex-wrap items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isCurrentDay ? 'bg-[#1A96F3] border-[#1A96F3] text-white' : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#101828]'
          }`}
        >
          <span className="text-[14px] font-bold">{dayPlan.day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${phaseClass}`}>
              {dayPlan.phase}
            </span>
            {isCurrentDay && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                Today
              </span>
            )}
            <span className="text-[10px] font-medium text-[#667085] flex items-center gap-1">
              <Clock size={11} />
              {dayPlan.duration}
            </span>
          </div>
          <h4 className="text-[15px] font-bold text-[#101828] leading-snug">{dayPlan.title}</h4>
        </div>
        <span className="text-[11px] font-semibold text-[#344054] bg-[#F8FAFC] border border-[#E5E7EB] px-2.5 py-1 rounded-full max-w-full truncate">
          {dayPlan.focusLabel}
        </span>
      </div>

      <ol className="px-5 py-4 space-y-3 flex-1 list-none">
        {dayPlan.tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#EFF8FF] text-[#1A96F3] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[13px] text-[#344054] leading-relaxed">{task}</p>
          </li>
        ))}
      </ol>

      <div className="mx-5 mb-5 mt-auto px-4 py-3 rounded-[12px] bg-[#F0FDF9] border border-[#CCFBEF]">
        <p className="text-[10px] font-bold text-[#047857] uppercase tracking-wider mb-1">Today&apos;s outcome</p>
        <p className="text-[13px] font-semibold text-[#101828] leading-snug">{dayPlan.outcome}</p>
      </div>
    </motion.div>
  );
}

export default function FourteenDaySprint({
  loading = false,
  userId,
  frequentErrors = [],
  strongestCrit,
  bottleneckCrit,
  latestBand,
  targetBand,
  activeTask = '',
  examCount = 0,
}) {
  const taskKey = activeTask || 'all';
  const [sprintRecord, setSprintRecord] = useState(null);

  const freshPlan = useMemo(
    () => buildSprintPlan({
      frequentErrors,
      strongestCrit,
      bottleneckCrit,
      latestBand,
      targetBand,
      activeTask,
      examCount,
    }),
    [frequentErrors, strongestCrit, bottleneckCrit, latestBand, targetBand, activeTask, examCount],
  );

  useEffect(() => {
    setSprintRecord(loadSprint(userId, taskKey));
  }, [userId, taskKey]);

  const active = sprintRecord && isSprintActive(sprintRecord);
  const complete = sprintRecord && isSprintComplete(sprintRecord);
  const currentDay = active ? Math.min(14, sprintDayNumber(sprintRecord.startedAt)) : null;
  const plan = active ? sprintRecord.plan : freshPlan;

  const handleStart = () => {
    if (freshPlan.empty) return;
    const record = startSprint(userId, taskKey, freshPlan);
    setSprintRecord(record);
  };

  const handleRestart = () => {
    clearSprint(userId, taskKey);
    setSprintRecord(null);
  };

  if (loading) {
    return (
      <div className="bg-[#F4F6F8] rounded-[20px] border border-[#E5E7EB] p-8 md:p-12 flex flex-col items-center justify-center min-h-[320px]">
        <div className="w-8 h-8 border-[3px] border-[#1A96F3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#667085] font-medium text-sm">Building your sprint plan…</p>
      </div>
    );
  }

  if (freshPlan.empty) {
    return (
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="min-h-[320px] flex flex-col items-center justify-center text-center gap-4 px-6 py-12">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3]">
            <CalendarDays size={28} strokeWidth={1.75} />
          </div>
          <div className="max-w-md">
            <p className="text-[17px] font-bold text-[#101828] mb-2">Two-Week Hyper-Growth Sprint</p>
            <p className="text-[14px] text-[#667085] leading-relaxed">{freshPlan.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {!active && !complete && (
        <div className="bg-[#EFF8FF] border border-[#B2DDFF] rounded-[16px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#101828]">Your plan is ready</p>
            <p className="text-[13px] text-[#667085] mt-0.5">
              Start when you&apos;re ready. The same 14 days will stay fixed so you can follow one clear path.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="shrink-0 h-[44px] px-5 rounded-[12px] bg-[#2C3E50] text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#1D2939] transition-colors"
          >
            <Play size={16} fill="currentColor" />
            Start 14-day sprint
          </button>
        </div>
      )}

      {active && (
        <div className="bg-[#F0FDF9] border border-[#CCFBEF] rounded-[16px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold text-[#101828]">
              Day {currentDay} of 14
              <span className="font-medium text-[#667085]">. Follow today&apos;s card below</span>
            </p>
            <p className="text-[13px] text-[#667085] mt-0.5">
              Your sprint plan is locked until Day 14. Strategy & Fix Cards refresh when you practice.
            </p>
          </div>
        </div>
      )}

      {complete && (
        <div className="bg-[#FFFAEB] border border-[#FEF0C7] rounded-[16px] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#101828]">Sprint complete</p>
            <p className="text-[13px] text-[#667085] mt-0.5">
              Start a new sprint to get an updated plan from your latest Fix Cards.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="shrink-0 h-[44px] px-5 rounded-[12px] bg-[#2C3E50] text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#1D2939] transition-colors"
          >
            <RotateCcw size={16} />
            Start next sprint
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 pt-6 pb-5 border-b border-[#F2F4F7]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] flex items-center justify-center text-[#1A96F3] shrink-0">
                <CalendarDays size={20} />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-[#101828]">Two-Week Hyper-Growth Sprint</h3>
                <p className="text-[13px] text-[#667085] mt-1 max-w-xl leading-relaxed">
                  Built from your Fix Cards and Strategic Roadmap.
                  {plan.goalGap !== '—' && (
                    <span>
                      {' '}Latest {plan.latestBand} → goal {plan.targetBand}
                      {plan.goalGap !== 'Target Reached' ? ` (${plan.goalGap})` : ' (target reached)'}.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {plan.focusErrors?.map((err) => (
                <span
                  key={err.label}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${impactChipClass(err)}`}
                >
                  {err.label}
                  {err.count != null && <span className="opacity-70"> · {err.count}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 md:px-8 py-4 flex flex-wrap gap-3 bg-[#F8FAFC]/80">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#475467] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full">
            <ClipboardList size={14} className="text-[#1A96F3]" />
            {plan.pacing}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#475467] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-full">
            <Target size={14} className="text-[#30C3A9]" />
            {plan.reviewCadence}
          </span>
          {complete && (
            <button
              type="button"
              onClick={handleRestart}
              className="text-[12px] font-medium text-[#667085] hover:text-[#101828] underline"
            >
              Clear sprint
            </button>
          )}
        </div>
      </div>

      {/* Weeks */}
      {plan.weeks?.map((week) => (
        <div key={week.label} className="space-y-4">
          <div className="px-1">
            <h4 className="text-[15px] font-bold text-[#101828]">{week.label}</h4>
            <p className="text-[13px] text-[#667085] mt-0.5">{week.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {week.days.map((dayPlan, idx) => (
              <DayCard
                key={dayPlan.day}
                dayPlan={dayPlan}
                index={idx}
                isCurrentDay={active && dayPlan.day === currentDay}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
