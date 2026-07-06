const { supabaseAdmin } = require('./supabase');
const { resolveTaskVariant } = require('../utils/taskVariant');

const SEVERITY_ORDER = { Major: 1, High: 2, Medium: 3, Low: 4 };
const GRA_CRITERIA = ['Grammatical Range and Accuracy', 'Grammar'];
const CONTENT_VERSION = 2;
const ESSAY_EXCERPT_LEN = 2500;

function norm(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isStructureUsed(structureName, usedSet) {
  const n = norm(structureName);
  if (!n) return false;
  for (const u of usedSet) {
    if (u.includes(n) || n.includes(u)) return true;
  }
  return false;
}

/**
 * Rich aggregation for teacher-quality PDF generation.
 */
function buildTeacherDossier(dossier) {
  const exams = dossier.exams || [];
  const errorMap = {};
  const byCriteria = {};
  const grammarErrors = [];
  const structuresUsedSet = new Set();
  const enrichmentCandidates = [];
  const lexicalItems = [];
  const taskResponse = {
    weaknesses: [],
    high_impact_fixes: [],
    strengths: [],
    deep_snippets: [],
  };
  const subCategoryAcc = {};

  exams.forEach((exam) => {
    (exam.errors || []).forEach((err) => {
      const crit = err.criteria || 'Other';
      if (!byCriteria[crit]) byCriteria[crit] = {};
      const key = `${err.title}::${err.sub_category || ''}`;
      if (!errorMap[key]) {
        errorMap[key] = {
          title: err.title,
          sub_category: err.sub_category,
          criteria: crit,
          severity: err.severity,
          count: 0,
          instances: [],
        };
      }
      errorMap[key].count += 1;
      errorMap[key].instances.push({
        exam_index: exam.exam_index,
        original_text: err.original_text,
        correction_text: err.correction_text,
        explanation: err.explanation,
        location_text: err.location_text,
      });
      if (!byCriteria[crit][key]) byCriteria[crit][key] = errorMap[key];

      if (GRA_CRITERIA.some((g) => crit.includes(g) || g.includes(crit))) {
        grammarErrors.push(errorMap[key]);
      }
    });

    const ga = exam.grammar_analysis || {};
    (ga.structures_used || []).forEach((s) => structuresUsedSet.add(norm(s)));

    (ga.enrichment_suggestions || []).forEach((sug) => {
      const item = typeof sug === 'string'
        ? { original: sug, improved: '', explanation: '' }
        : {
            original: sug.original || sug.structure || '',
            improved: sug.improved || sug.example_context || '',
            explanation: sug.explanation || sug.benefit || '',
          };
      enrichmentCandidates.push({ exam_index: exam.exam_index, ...item });
    });

    const va = exam.vocabulary_analysis || {};
    (va.categories || []).forEach((cat) => {
      (cat.words || []).forEach((w) => {
        lexicalItems.push({
          exam_index: exam.exam_index,
          category: cat.name,
          word: w.word,
          definition: w.definition,
          example: w.example,
        });
      });
    });

    taskResponse.weaknesses.push(...(exam.weaknesses || []).map((w) => ({ exam_index: exam.exam_index, text: w })));
    taskResponse.high_impact_fixes.push(...(exam.high_impact_fixes || []).map((w) => ({ exam_index: exam.exam_index, text: w })));
    taskResponse.strengths.push(...(exam.strengths || []).map((w) => ({ exam_index: exam.exam_index, text: w })));

    const deepBlocks = [
      exam.argumentation_analysis,
      exam.letter_structure_analysis,
      exam.data_structure_analysis,
      exam.flow_logic_analysis,
    ].filter(Boolean);
    deepBlocks.forEach((block) => {
      taskResponse.deep_snippets.push({ exam_index: exam.exam_index, content: block });
    });

    const subs = exam.sub_category_scores || {};
    Object.entries(subs).forEach(([crit, data]) => {
      const subcats = data?.sub_categories || data || {};
      Object.entries(subcats).forEach(([name, sc]) => {
        const score = typeof sc === 'object' ? parseFloat(sc.score ?? sc.band) : parseFloat(sc);
        if (Number.isNaN(score)) return;
        if (!subCategoryAcc[name]) subCategoryAcc[name] = { scores: [], weaknesses: [] };
        subCategoryAcc[name].scores.push(score);
        const weak = typeof sc === 'object' ? sc.weaknesses : null;
        if (weak) subCategoryAcc[name].weaknesses.push(weak);
      });
    });
  });

  const recurring_errors = Object.values(errorMap)
    .sort((a, b) => b.count - a.count);

  const by_criteria = {};
  Object.entries(byCriteria).forEach(([crit, map]) => {
    by_criteria[crit] = Object.values(map).sort((a, b) => b.count - a.count);
  });

  const enrichmentCounts = {};
  enrichmentCandidates.forEach((e) => {
    const k = norm(e.original);
    if (!k) return;
    if (!enrichmentCounts[k]) enrichmentCounts[k] = { ...e, count: 0, exams: [] };
    enrichmentCounts[k].count += 1;
    enrichmentCounts[k].exams.push(e.exam_index);
  });

  const unused_enrichments = Object.values(enrichmentCounts)
    .filter((e) => !isStructureUsed(e.original, structuresUsedSet))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => ({
      original: e.original,
      improved: e.improved,
      explanation: e.explanation,
      suggested_in_exams: [...new Set(e.exams)],
      times_suggested: e.count,
    }));

  const sub_category_scores = {};
  Object.entries(subCategoryAcc).forEach(([name, data]) => {
    const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    sub_category_scores[name] = {
      avg_score: Math.round(avg * 10) / 10,
      min_score: Math.min(...data.scores),
      weaknesses: [...new Set(data.weaknesses.filter(Boolean))].slice(0, 3),
    };
  });

  return {
    content_version: CONTENT_VERSION,
    recurring_errors: recurring_errors.slice(0, 40),
    by_criteria,
    grammar: {
      recurring_errors: grammarErrors
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      structures_used: [...structuresUsedSet].filter(Boolean),
      unused_enrichments,
      all_enrichment_suggestions: enrichmentCandidates.slice(0, 20),
    },
    lexical: {
      weak_vocabulary: lexicalItems.slice(0, 30),
    },
    task_response: taskResponse,
    sub_category_scores,
  };
}

/**
 * Fetch graded submissions in chronological order (all task types).
 */
async function getGradedSubmissions(userId) {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id, exam_type, task_type, essay_content, word_count, created_at, status')
    .eq('user_id', userId)
    .eq('status', 'graded')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

function editionRange(editionNumber) {
  const start = (editionNumber - 1) * 5 + 1;
  const end = editionNumber * 5;
  return { start, end };
}

/**
 * Build preview stats from report_errors only (no LLM).
 */
async function buildPreviewStats(submissionIds) {
  if (!submissionIds.length) {
    return {
      examCount: 0,
      avgBands: null,
      errorsByCriteria: {},
      topErrors: [],
    };
  }

  const { data: reports } = await supabaseAdmin
    .from('reports')
    .select('id, submission_id, overall_band, response_band, coherence_band, vocabulary_band, grammar_band')
    .in('submission_id', submissionIds);

  const reportList = reports || [];
  const reportIds = reportList.map((r) => r.id);

  let errorsByCriteria = {};
  let errorCounts = {};

  if (reportIds.length) {
    const { data: errors } = await supabaseAdmin
      .from('report_errors')
      .select('title, severity, criteria, sub_category')
      .in('report_id', reportIds);

    (errors || []).forEach((e) => {
      const crit = e.criteria || 'Other';
      errorsByCriteria[crit] = (errorsByCriteria[crit] || 0) + 1;
      const key = e.title || 'Unknown';
      if (!errorCounts[key]) {
        errorCounts[key] = { label: key, count: 0, severity: e.severity, criteria: crit };
      }
      errorCounts[key].count += 1;
    });
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const nums = (field) => reportList.map((r) => parseFloat(r[field])).filter((n) => !Number.isNaN(n));

  const topErrors = Object.values(errorCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    examCount: submissionIds.length,
    avgBands: {
      overall: avg(nums('overall_band')),
      response: avg(nums('response_band')),
      coherence: avg(nums('coherence_band')),
      vocabulary: avg(nums('vocabulary_band')),
      grammar: avg(nums('grammar_band')),
    },
    errorsByCriteria,
    topErrors,
  };
}

/**
 * Full dossier for paid PDF generation — mirrors /api/reports shape per exam.
 */
async function buildFullDossier(userId, editionNumber) {
  const submissions = await getGradedSubmissions(userId);
  const { start, end } = editionRange(editionNumber);
  const slice = submissions.slice(start - 1, end);

  if (slice.length < 5) {
    throw new Error(`Edition ${editionNumber} requires 5 graded exams (have ${slice.length} in range).`);
  }

  const submissionIds = slice.map((s) => s.id);

  const { data: reports, error: repError } = await supabaseAdmin
    .from('reports')
    .select('*')
    .in('submission_id', submissionIds);

  if (repError) throw repError;

  const reportBySub = Object.fromEntries((reports || []).map((r) => [r.submission_id, r]));
  const reportIds = (reports || []).map((r) => r.id);

  const { data: allErrors } = await supabaseAdmin
    .from('report_errors')
    .select('id, report_id, title, severity, criteria, sub_category, location_text, original_text, correction_text, explanation')
    .in('report_id', reportIds);

  const errorsByReport = {};
  (allErrors || []).forEach((e) => {
    if (!errorsByReport[e.report_id]) errorsByReport[e.report_id] = [];
    errorsByReport[e.report_id].push(e);
  });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, target_band')
    .eq('id', userId)
    .single();

  const exams = slice.map((sub, idx) => {
    const report = reportBySub[sub.id];
    if (!report) return null;

    const rawOutput = report.raw_grader_output || {};
    const deep = rawOutput.deep || {};
    const primary = rawOutput.primary || {};
    const task_variant = rawOutput.task_variant || resolveTaskVariant(sub.exam_type, sub.task_type);

    const errors = (errorsByReport[report.id] || []).sort(
      (a, b) => (SEVERITY_ORDER[a.severity] || 5) - (SEVERITY_ORDER[b.severity] || 5)
    );

    return {
      exam_index: start + idx,
      submission_id: sub.id,
      exam_type: sub.exam_type,
      task_type: sub.task_type,
      task_variant,
      word_count: sub.word_count,
      created_at: sub.created_at,
      essay_excerpt: (sub.essay_content || '').slice(0, ESSAY_EXCERPT_LEN),
      essay_full: sub.essay_content || '',
      overall_band: parseFloat(report.overall_band),
      response_band: parseFloat(report.response_band),
      coherence_band: parseFloat(report.coherence_band),
      vocabulary_band: parseFloat(report.vocabulary_band),
      grammar_band: parseFloat(report.grammar_band),
      strengths: report.strengths || [],
      weaknesses: report.weaknesses || [],
      high_impact_fixes: report.high_impact_fixes || [],
      vocabulary_analysis: report.vocabulary_analysis || null,
      grammar_analysis: report.grammar_analysis || null,
      sub_category_scores: primary.sub_category_scores || {},
      data_structure_analysis: deep.data_structure_analysis || report.data_structure_analysis || null,
      argumentation_analysis: deep.argumentation_analysis || null,
      letter_structure_analysis: deep.letter_structure_analysis || null,
      flow_logic_analysis: deep.flow_logic_analysis || null,
      errors,
    };
  }).filter(Boolean);

  if (exams.length < 5) {
    throw new Error('Missing reports for one or more submissions in edition range.');
  }

  const preview = await buildPreviewStats(submissionIds);

  const base = {
    user_id: userId,
    candidate_name: profile?.full_name || 'Candidate',
    target_band: profile?.target_band ? parseFloat(profile.target_band) : null,
    edition_number: editionNumber,
    exam_range: { start, end },
    submission_ids: submissionIds,
    generated_at: new Date().toISOString(),
    content_version: CONTENT_VERSION,
    preview,
    exams,
  };

  base.aggregated = buildTeacherDossier(base);
  return base;
}

async function getOrCreateEditionRow(userId, editionNumber, submissionIds) {
  const { start, end } = editionRange(editionNumber);

  const { data: existing } = await supabaseAdmin
    .from('personalized_learning_editions')
    .select('*')
    .eq('user_id', userId)
    .eq('edition_number', editionNumber)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabaseAdmin
    .from('personalized_learning_editions')
    .insert({
      user_id: userId,
      edition_number: editionNumber,
      exam_range_start: start,
      exam_range_end: end,
      submission_ids: submissionIds,
      status: 'preview',
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

module.exports = {
  getGradedSubmissions,
  editionRange,
  buildPreviewStats,
  buildFullDossier,
  buildTeacherDossier,
  getOrCreateEditionRow,
  EXAMS_PER_EDITION: 5,
  LEARNING_PRICE_CENTS: 500,
  CONTENT_VERSION,
};
