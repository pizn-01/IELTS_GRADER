-- ============================================================
-- Add missing index on report_errors(sub_category)
-- Used by analytics aggregation query in /api/analytics/dashboard
-- Rollback: DROP INDEX IF EXISTS idx_report_errors_sub_category;
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_report_errors_sub_category
  ON public.report_errors(sub_category);
