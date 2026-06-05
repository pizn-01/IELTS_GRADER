-- ============================================================
-- Add deep-analysis columns to reports
-- These are populated by the new third grader AI call and
-- power the Model Answer, Vocabulary, Grammar, Data Structure
-- tabs in the report UI.
--
-- Rollback:
--   ALTER TABLE public.reports
--     DROP COLUMN IF EXISTS model_answer,
--     DROP COLUMN IF EXISTS vocabulary_analysis,
--     DROP COLUMN IF EXISTS grammar_analysis,
--     DROP COLUMN IF EXISTS data_structure_analysis;
-- ============================================================

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS model_answer              jsonb,
  ADD COLUMN IF NOT EXISTS vocabulary_analysis       jsonb,
  ADD COLUMN IF NOT EXISTS grammar_analysis          jsonb,
  ADD COLUMN IF NOT EXISTS data_structure_analysis   jsonb;

COMMENT ON COLUMN public.reports.model_answer IS
  'AI-generated revised essay: {text, estimated_band, key_changes[]}';

COMMENT ON COLUMN public.reports.vocabulary_analysis IS
  'Vocabulary breakdown: {categories: [{name, description, words: [{word, definition, example}]}]}';

COMMENT ON COLUMN public.reports.grammar_analysis IS
  'Grammar analysis: {overview_strengths, overview_weaknesses, structures_used[], enrichment_suggestions[{original,improved,explanation}], expert_tips[]}';

COMMENT ON COLUMN public.reports.data_structure_analysis IS
  'Essay structure: {overview, introduction_strengths[], introduction_weaknesses[], body_analysis, conclusion_strengths[], conclusion_weaknesses[], task_achievement_rating, task_achievement_feedback, transition_analysis, authenticity_feedback}';
