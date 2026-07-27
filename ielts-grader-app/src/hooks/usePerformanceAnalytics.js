import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

/**
 * Shared analytics for Dashboard Performance tabs (Overview extras, Fix Cards, Strategy, Sprint).
 * When taskType is set, filters analytics + submissions to that task.
 */
export function usePerformanceAnalytics(taskType = '', { enabled = true } = {}) {
  const [chartData, setChartData] = useState([]);
  const [frequentErrors, setFrequentErrors] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPerformanceData = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    const analyticsArgs = taskType ? { taskType } : undefined;
    const submissionsArgs = taskType ? { limit: 100, taskType } : { limit: 100 };
    Promise.all([
      api.getDashboardAnalytics(analyticsArgs),
      api.getSubmissions(submissionsArgs),
    ]).then(([analytics, subRes]) => {
      setChartData(analytics.chartData || []);
      setFrequentErrors((analytics.frequentErrors || []).slice().sort((a, b) => b.count - a.count));
      setSubmissions((subRes.data || []).filter((s) => s.status === 'graded'));
    }).catch(() => {
      setChartData([]);
      setFrequentErrors([]);
      setSubmissions([]);
    }).finally(() => setLoading(false));
  }, [taskType, enabled]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchPerformanceData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchPerformanceData, enabled]);

  const derived = useMemo(() => {
    const overallScores = chartData.map((d) => d.overall).filter(Boolean);
    const latestBand = overallScores[overallScores.length - 1] ?? null;
    const firstBand = overallScores[0] ?? null;
    const avgBand = overallScores.length
      ? (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(1)
      : null;
    const bestBand = overallScores.length ? Math.max(...overallScores).toFixed(1) : null;
    const bandChange = latestBand != null && firstBand != null
      ? (latestBand - firstBand).toFixed(1)
      : null;

    const examCount = submissions.length;
    const studyPeriod = (() => {
      if (submissions.length === 0) return 'No exams yet';
      const dates = submissions.map((s) => new Date(s.created_at)).sort((a, b) => a - b);
      if (dates.length === 1) {
        return dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return `${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    })();

    const trendLabel = bandChange == null
      ? 'Getting Started'
      : parseFloat(bandChange) > 0.4
        ? 'On the Rise'
        : parseFloat(bandChange) < -0.4
          ? 'Declining'
          : 'Holding Steady';
    const trendDetail = bandChange == null
      ? 'Complete your first exam to begin tracking progress.'
      : `Overall improvement: ${parseFloat(bandChange) >= 0 ? '+' : ''}${bandChange} from first to latest attempt.`;
    const topErrors = frequentErrors.slice(0, 3).map((e) => e.label);
    const topPriorityText = topErrors.length > 0
      ? `Focus heavily on reducing: ${topErrors.join(', ')}.`
      : 'Complete more exams to identify patterns.';

    const avgCriteria = [
      { name: 'Coherence & Cohesion', field: 'coherence' },
      { name: 'Lexical Resource', field: 'vocabulary' },
      { name: 'Task Response', field: 'response' },
      { name: 'Grammatical Range', field: 'grammar' },
    ].map((c) => {
      const vals = chartData.map((d) => d[c.field]).filter(Boolean);
      return { name: c.name, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
    }).filter((c) => c.avg != null).sort((a, b) => b.avg - a.avg);

    const strongestCrit = avgCriteria[0] ?? { name: 'Coherence & Cohesion', avg: null };
    const bottleneckCrit = avgCriteria[avgCriteria.length - 1] ?? { name: 'Grammatical Range', avg: null };

    const criterionCards = [
      { label: 'Task Response', field: 'response' },
      { label: 'Lexical Resource', field: 'vocabulary' },
      { label: 'Coherence', field: 'coherence' },
      { label: 'Grammatical', field: 'grammar' },
    ].map((c) => {
      const vals = chartData.map((d) => d[c.field]).filter((v) => v != null);
      const first = vals.length > 0 ? parseFloat(vals[0]).toFixed(1) : null;
      const latest = vals.length > 0 ? parseFloat(vals[vals.length - 1]).toFixed(1) : null;
      const average = vals.length
        ? (vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length).toFixed(1)
        : null;
      const growth = first && latest ? (parseFloat(latest) - parseFloat(first)).toFixed(1) : null;
      return {
        label: c.label,
        first: first ?? '—',
        average: average ?? '—',
        latest: latest ?? '—',
        growth: growth != null ? (parseFloat(growth) >= 0 ? `+${growth}` : growth) : '—',
        positive: growth != null ? parseFloat(growth) >= 0 : true,
      };
    });

    const totalInstances = frequentErrors.reduce((s, e) => s + (e.count || 0), 0);
    const uniqueTypes = frequentErrors.length;

    return {
      latestBand,
      firstBand,
      avgBand,
      bestBand,
      bandChange,
      examCount,
      studyPeriod,
      trendLabel,
      trendDetail,
      topPriorityText,
      strongestCrit,
      bottleneckCrit,
      criterionCards,
      totalInstances,
      uniqueTypes,
    };
  }, [chartData, frequentErrors, submissions]);

  return {
    chartData,
    frequentErrors,
    submissions,
    loading,
    refresh: fetchPerformanceData,
    ...derived,
  };
}
