import { formatGoalGap } from './goalProgress';

const PHASES = {
  AUDIT: 'Audit',
  DRILL: 'Drill',
  WRITE: 'Write',
  COMBINE: 'Combine',
  REVIEW: 'Review',
  CRITERION: 'Criterion',
  REWRITE: 'Rewrite',
  MOCK: 'Mock',
};

function mockTiming(activeTask) {
  const isTask1 = activeTask.includes('Task 1');
  const isGeneral = activeTask.startsWith('General');
  if (isTask1) {
    return {
      label: activeTask || 'Academic Task 1',
      minutes: isGeneral ? 20 : 20,
      essayType: isGeneral ? 'letter' : 'report',
      wordHint: isGeneral ? '150+ words' : '150+ words',
    };
  }
  return {
    label: activeTask || 'Academic Task 2',
    minutes: 40,
    essayType: 'essay',
    wordHint: '250+ words',
  };
}

function errorFocus(error, fallbackLabel) {
  if (!error) return { label: fallbackLabel, count: null, impact: null };
  return {
    label: error.label,
    count: error.count ?? null,
    impact: error.impact || error.type || null,
  };
}

function countPhrase(error) {
  if (!error?.count) return 'in your recent reports';
  return `appeared ${error.count} time${error.count === 1 ? '' : 's'} across your reports`;
}

function checklist(topErrors) {
  const names = topErrors.slice(0, 2).map((e) => e.label);
  const base = names.length ? names.join(', ') : 'your top Fix Card targets';
  return `${base}, referencing, articles, repetition`;
}

function day(overrides) {
  return {
    duration: '30–45 min',
    focusType: 'error',
    ...overrides,
  };
}

/**
 * Build a personalized 14-day sprint from Fix Cards and Strategy data.
 */
export function buildSprintPlan({
  frequentErrors = [],
  strongestCrit = { name: 'Coherence & Cohesion', avg: null },
  bottleneckCrit = { name: 'Grammatical Range', avg: null },
  latestBand = null,
  targetBand = null,
  activeTask = '',
  examCount = 0,
}) {
  if (!examCount || examCount < 1) {
    return {
      empty: true,
      reason: 'Complete at least one graded exam to unlock your personalized two-week sprint.',
    };
  }

  const errors = frequentErrors.slice(0, 4);
  const e1 = errorFocus(errors[0], bottleneckCrit.name);
  const e2 = errorFocus(errors[1] || errors[0], bottleneckCrit.name);
  const e3 = errorFocus(errors[2] || errors[1] || errors[0], bottleneckCrit.name);
  const mock = mockTiming(activeTask);
  const goalGap = formatGoalGap(latestBand, targetBand);
  const topChecklist = checklist(errors.length ? errors : [{ label: bottleneckCrit.name }]);
  const strengthName = strongestCrit?.name || 'your strongest criterion';
  const bottleneckName = bottleneckCrit?.name || 'your weakest criterion';
  const bottleneckAvg = bottleneckCrit?.avg != null ? bottleneckCrit.avg.toFixed(1) : null;
  const latestLabel = latestBand != null ? Number(latestBand).toFixed(1) : '—';
  const targetLabel = targetBand != null ? Number(targetBand).toFixed(1) : '7.0';

  const week1Days = [
    day({
      day: 1,
      week: 1,
      phase: PHASES.AUDIT,
      title: 'Set Up & Baseline',
      focusLabel: e1.label,
      focusType: 'error',
      duration: '35–45 min',
      tasks: [
        `Open your most recent graded ${mock.label} essay and highlight every instance of "${e1.label}" (${countPhrase(errors[0])}).`,
        'Pick the 3 weakest sentences where this pattern appears and rewrite each one correctly in a separate document.',
        `Write a 3-step personal checklist on a sticky note: (1) scan for "${e1.label}", (2) add one concrete example per body paragraph, (3) 2-minute proofread pass.`,
      ],
      outcome: `Three corrected sentences and a reusable checklist targeting "${e1.label}".`,
    }),
    day({
      day: 2,
      week: 1,
      phase: PHASES.DRILL,
      title: `Deep Dive: ${e1.label}`,
      focusLabel: e1.label,
      tasks: [
        `Choose a past essay where you scored lowest on ${bottleneckName}.`,
        `Spend 20 minutes editing one body paragraph only for "${e1.label}", ignore all other issues for now.`,
        'Read the revised paragraph aloud to confirm it sounds natural and exam-ready.',
      ],
      outcome: `One body paragraph completely free of "${e1.label}".`,
    }),
    day({
      day: 3,
      week: 1,
      phase: PHASES.WRITE,
      title: 'Applied Writing: Error #1',
      focusLabel: e1.label,
      tasks: [
        `Write a fresh introduction and one body paragraph for any ${mock.label} prompt.`,
        `Before finishing, run a strict 5-minute proofread focused only on "${e1.label}".`,
        'Add one mechanism sentence (because/so) and one concrete example in the body paragraph.',
      ],
      outcome: `One intro and body paragraph with zero "${e1.label}" issues.`,
    }),
    day({
      day: 4,
      week: 1,
      phase: PHASES.DRILL,
      title: `Deep Dive: ${e2.label}`,
      focusLabel: e2.label,
      tasks: [
        errors[1]
          ? `Your second priority Fix Card is "${e2.label}" (${countPhrase(errors[1])}). Highlight it in a different past essay.`
          : `With one dominant error pattern, today extend your "${e1.label}" drill using ${bottleneckName} as your score focus.`,
        `Rewrite one full paragraph targeting "${e2.label}" only, do not edit for other errors yet.`,
        'Compare your rewrite to the original and note what specifically changed.',
      ],
      outcome: `A clean paragraph demonstrating control of "${e2.label}".`,
    }),
    day({
      day: 5,
      week: 1,
      phase: PHASES.WRITE,
      title: 'Applied Writing: Error #2',
      focusLabel: e2.label,
      tasks: [
        'Build a quick outline: Main idea → Because → Example (one line each).',
        `Draft one body paragraph from the outline, proofreading specifically for "${e2.label}".`,
        'Ensure the paragraph has a clear topic sentence and logical link to the main position.',
      ],
      outcome: `One structured body paragraph with zero "${e2.label}" mistakes.`,
    }),
    day({
      day: 6,
      week: 1,
      phase: PHASES.COMBINE,
      title: 'Combine & Conquer',
      focusLabel: `${e1.label} + ${e2.label}`,
      tasks: [
        `Write two body paragraphs today. Avoid both "${e1.label}" and "${e2.label}".`,
        'Ignore the clock today, prioritise quality, accuracy, and applying your Day 1 checklist.',
        `Keep ${strengthName} stable while you lift these two error targets.`,
      ],
      outcome: 'Two high-quality body paragraphs checking both top Fix Cards.',
    }),
    day({
      day: 7,
      week: 1,
      phase: PHASES.REVIEW,
      title: 'Week 1 Review',
      focusLabel: 'Progress check',
      focusType: 'review',
      duration: '25–35 min',
      tasks: [
        'Self-grade your Day 6 paragraphs using the checklist you created on Day 1.',
        `Note whether "${e1.label}" and "${e2.label}" still appear, if yes, rewrite the worst sentence 3 times correctly.`,
        'Rest and recharge. Consistent focused practice beats burnout.',
      ],
      outcome: 'A clear picture of Week 1 progress and adjusted priorities for Week 2.',
    }),
  ];

  const week2Days = [
    day({
      day: 8,
      week: 2,
      phase: PHASES.DRILL,
      title: errors[2] ? `Targeting: ${e3.label}` : `Criterion Focus: ${bottleneckName}`,
      focusLabel: errors[2] ? e3.label : bottleneckName,
      focusType: errors[2] ? 'error' : 'criterion',
      tasks: errors[2]
        ? [
            `Week 2 starts with your third priority: "${e3.label}" (${countPhrase(errors[2])}).`,
            `Open a recent essay and fix every instance of "${e3.label}" in one section.`,
            'Write one new sentence that models the correct pattern for this error type.',
          ]
        : [
            `${bottleneckName}${bottleneckAvg ? ` is averaging ${bottleneckAvg}` : ''}, your primary bottleneck.`,
            `Select your weakest paragraph and upgrade it specifically for ${bottleneckName}.`,
            `List two concrete habits that would lift ${bottleneckName} in your next essay.`,
          ],
      outcome: errors[2]
        ? `Measurable reduction of "${e3.label}" in one essay section.`
        : `A strengthened paragraph targeting ${bottleneckName}.`,
    }),
    day({
      day: 9,
      week: 2,
      phase: PHASES.CRITERION,
      title: `Lift ${bottleneckName}`,
      focusLabel: bottleneckName,
      focusType: 'criterion',
      tasks: [
        `Today is criterion-focused: raise ${bottleneckName} while keeping ${strengthName} stable.`,
        'Take a prompt you have struggled with and build an outline (position + 2 body ideas + examples).',
        `Draft one body paragraph applying your Fix Card rules and ${bottleneckName} improvements.`,
      ],
      outcome: `One body paragraph that directly addresses your ${bottleneckName} bottleneck.`,
    }),
    day({
      day: 10,
      week: 2,
      phase: PHASES.REWRITE,
      title: 'Rewrite Recipe (Steps 1–3)',
      focusLabel: 'Task Response & Ideas',
      focusType: 'strategy',
      tasks: [
        'Step 1: Fix task response, answer all parts of the prompt with a clear position.',
        'Step 2: Expand ideas, add because + example to any underdeveloped point.',
        `Step 3: Upgrade lexis, remove repetition; target "${e1.label}" if it is a vocabulary issue.`,
      ],
      outcome: 'A rewritten paragraph with stronger task response, ideas, and word choice.',
    }),
    day({
      day: 11,
      week: 2,
      phase: PHASES.REWRITE,
      title: 'Rewrite Recipe (Steps 4–5)',
      focusLabel: 'Cohesion & Grammar',
      focusType: 'strategy',
      tasks: [
        'Step 4: Tighten cohesion, improve referencing (this/these/it) and logical links (however, therefore).',
        'Step 5: Grammar sweep: SVA, articles, punctuation; re-check your top two Fix Cards.',
        `Read the paragraph aloud and confirm ${strengthName} still reads naturally.`,
      ],
      outcome: 'A polished paragraph with improved cohesion and grammatical accuracy.',
    }),
    day({
      day: 12,
      week: 2,
      phase: PHASES.MOCK,
      title: 'Timed Mock Test',
      focusLabel: mock.label,
      focusType: 'mock',
      duration: `${mock.minutes + 6} min`,
      tasks: [
        `Write a full ${mock.label} ${mock.essayType} in exactly ${mock.minutes} minutes (${mock.wordHint}).`,
        `Save 6 minutes at the end for your checklist: ${topChecklist}.`,
        'No dictionary, notes, or grammar checkers, treat this exactly like the real exam.',
      ],
      outcome: `One completed ${mock.label} ${mock.essayType} under strict exam conditions.`,
    }),
    day({
      day: 13,
      week: 2,
      phase: PHASES.REVIEW,
      title: 'Self-Examiner Review',
      focusLabel: 'Fix Card audit',
      focusType: 'review',
      tasks: [
        "Grade yesterday's essay using your Day 1 checklist and the Fix Cards tab as your rubric.",
        `Re-write the worst 2 sentences for "${e1.label}"${errors[1] ? ` and "${e2.label}"` : ''}.`,
        'Log which errors still appear and rank them for your final mock tomorrow.',
      ],
      outcome: 'A self-graded essay with targeted sentence-level corrections.',
    }),
    day({
      day: 14,
      week: 2,
      phase: PHASES.MOCK,
      title: 'Sprint Close & Final Mock',
      focusLabel: mock.label,
      focusType: 'mock',
      duration: `${mock.minutes + 10} min`,
      tasks: [
        `Final timed ${mock.label} ${mock.essayType}: ${mock.minutes} minutes write + 6-minute checklist (${topChecklist}).`,
        `Sprint retrospective: latest band ${latestLabel}, goal Band ${targetLabel} (${goalGap}).`,
        `Plan next steps: maintain ${strengthName} while continuing to reduce "${e1.label}"${errors[1] ? ` and "${e2.label}"` : ''}.`,
      ],
      outcome: `Sprint complete, final mock submitted and a clear plan to close ${goalGap} to your goal.`,
    }),
  ];

  return {
    empty: false,
    pacing: '~4 essays/week · daily drills 30–45 min',
    reviewCadence: 'Review on Day 7 and Day 14',
    goalGap,
    latestBand: latestLabel,
    targetBand: targetLabel,
    focusErrors: errors.slice(0, 3).map((e) => ({
      label: e.label,
      count: e.count,
      impact: e.impact,
      type: e.type,
    })),
    weeks: [
      { label: 'Week 1: Fix Card Focus', subtitle: 'Diagnose and drill your top priority errors', days: week1Days },
      { label: 'Week 2: Integration & Exam Simulation', subtitle: 'Criterion lift, rewrite recipe, and timed mocks', days: week2Days },
    ],
  };
}
