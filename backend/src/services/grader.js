const OpenAI = require('openai');
const { supabaseAdmin } = require('./supabase');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000 });

// Clamp a raw score to valid IELTS 0.5-increment bands (1.0–9.0)
function clampBand(raw) {
  const num = parseFloat(raw);
  if (isNaN(num)) return 5.0;
  const clamped = Math.min(9.0, Math.max(1.0, num));
  return Math.round(clamped * 2) / 2;
}

// ─── Look up question text from exam_tasks if an id was provided ──────────────
async function getQuestionText(exam_task_id) {
  if (!exam_task_id) return null;
  const { data } = await supabaseAdmin
    .from('exam_tasks')
    .select('question_text')
    .eq('id', exam_task_id)
    .single();
  return data?.question_text || null;
}

// ─── PROMPT 1: Primary grading (bands + errors + strengths/weaknesses) ────────
function buildPrimaryPrompt(examType, taskType, questionText, essayContent, wordCount) {
  const isTask1 = taskType === 'Task 1';
  const taskGuidance = isTask1
    ? `This is IELTS ${examType} Writing Task 1. ${examType === 'Academic'
        ? 'The candidate must summarize, describe, or explain information from a graph, chart, table, or diagram. Minimum 150 words.'
        : 'The candidate must write a formal or semi-formal/informal letter responding to a given situation. Minimum 150 words.'}`
    : `This is IELTS ${examType} Writing Task 2. The candidate must write a discursive essay in response to a point of view, argument, or problem. Minimum 250 words.`;

  return `You are a certified IELTS examiner with 20+ years of experience. Grade the essay below strictly and honestly using official IELTS band descriptors.

${taskGuidance}

${questionText ? `QUESTION / PROMPT:\n${questionText}\n\n` : ''}CANDIDATE ESSAY (${wordCount} words):
${essayContent}

Return ONLY a valid JSON object. Use the full 1.0–9.0 band scale in 0.5 increments. Be accurate — most candidates score between 4.0 and 7.5.

{
  "overall_band": <average of 4 criteria bands, rounded to nearest 0.5>,
  "response_band": <Task Response / Task Achievement band>,
  "coherence_band": <Coherence and Cohesion band>,
  "vocabulary_band": <Lexical Resource band>,
  "grammar_band": <Grammatical Range and Accuracy band>,
  "strengths": [<3–5 concise, specific strengths observed in this essay>],
  "weaknesses": [<3–5 concise, specific weaknesses that lowered the band score>],
  "high_impact_fixes": [
    {
      "issue": "<concise name of the issue>",
      "suggestion": "<specific, actionable fix>",
      "impact": "High" | "Medium" | "Low"
    }
  ],
  "errors": [
    {
      "title": "<short descriptive error title>",
      "severity": "Major" | "High" | "Medium" | "Low",
      "criteria": "Task Response" | "Coherence & Cohesion" | "Lexical Resource" | "Grammatical Range & Accuracy",
      "sub_category": "<e.g. Word Choice, Data Accuracy, Coverage, Range, Structure, Referencing, Accuracy, Punctuation, Development, Cohesive Devices, Comparison>",
      "location_text": "<e.g. Paragraph 2, Sentence 1>",
      "original_text": "<exact problematic excerpt from the essay (keep short)>",
      "correction_text": "<corrected version of that excerpt>",
      "explanation": "<clear explanation of why this is an error and how the correction improves the score>"
    }
  ],
  "sub_category_scores": {
    "Task Response": [
      { "name": "<sub-category e.g. Data Coverage, Key Features, Overview, Comparison, Development, Data Accuracy for Task1; or Position, Arguments, Support, Counter-argument, Conclusion for Task2>", "band": <1.0–9.0 in 0.5 increments>, "strength": "<one specific observed strength>", "weakness": "<one specific observed weakness>" }
    ],
    "Coherence & Cohesion": [
      { "name": "<sub-category e.g. Cohesive Devices, Structure, Referencing, Paragraphing, Progression>", "band": <1.0–9.0 in 0.5 increments>, "strength": "<strength>", "weakness": "<weakness>" }
    ],
    "Lexical Resource": [
      { "name": "<sub-category e.g. Range, Word Choice, Collocations, Spelling/Form, Paraphrasing>", "band": <1.0–9.0 in 0.5 increments>, "strength": "<strength>", "weakness": "<weakness>" }
    ],
    "Grammatical Range & Accuracy": [
      { "name": "<sub-category e.g. Structure Range, Sentence Variety, Accuracy, Tense Usage, Punctuation>", "band": <1.0–9.0 in 0.5 increments>, "strength": "<strength>", "weakness": "<weakness>" }
    ]
  }
}

Provide 6–14 errors covering a realistic range of severity. For "Major" errors, mark issues that alone can drop a band score. Be specific about location. Do not include errors that are not actually present in the essay. For sub_category_scores, include 4–6 sub-categories per criterion, with band scores consistent with the criterion's overall band.`;
}

// ─── PROMPT 2: Secondary grade (dual assessment — second model opinion) ──────
function buildSecondaryGradePrompt(examType, taskType, questionText, essayContent, wordCount) {
  const isTask1 = taskType === 'Task 1';
  const taskGuidance = isTask1
    ? `This is IELTS ${examType} Writing Task 1.`
    : `This is IELTS ${examType} Writing Task 2.`;
  return `You are a certified IELTS examiner. Grade the essay below using official IELTS band descriptors. Be independent — do not replicate another examiner's grade, form your own assessment.

${taskGuidance}

${questionText ? `QUESTION:\n${questionText}\n\n` : ''}ESSAY (${wordCount} words):
${essayContent}

Return ONLY a valid JSON object. Use the full 1.0–9.0 band scale in 0.5 increments.

{
  "overall_band": <average of 4 criteria bands, rounded to nearest 0.5>,
  "response_band": <Task Response / Task Achievement band>,
  "coherence_band": <Coherence and Cohesion band>,
  "vocabulary_band": <Lexical Resource band>,
  "grammar_band": <Grammatical Range and Accuracy band>
}`;
}

// ─── PROMPT 3: Deep analysis (model answer + vocabulary + grammar + structure) ─
function buildDeepPrompt(examType, taskType, questionText, essayContent, primaryResult) {
  return `You are a certified IELTS examiner and writing coach. Based on this graded essay, produce a deep analysis.

QUESTION / PROMPT:
${questionText || '(No specific prompt provided — analyze essay quality in general)'}

CANDIDATE ESSAY:
${essayContent}

GRADING SUMMARY: Overall Band ${primaryResult.overall_band} | TR ${primaryResult.response_band} | CC ${primaryResult.coherence_band} | LR ${primaryResult.vocabulary_band} | GRA ${primaryResult.grammar_band}

Return ONLY a valid JSON object with this exact structure:

{
  "model_answer": {
    "text": "<Complete model answer essay for the same prompt at Band 8.0 level. Write all paragraphs fully. Task 2: 260–310 words. Task 1 Academic: 165–185 words. Task 1 General: 165–185 words.>",
    "estimated_band": 8.0,
    "key_changes": [
      "<Change 1 — what was improved vs the candidate essay and why>",
      "<Change 2>",
      "<Change 3>",
      "<Change 4>",
      "<Change 5>"
    ]
  },
  "vocabulary_analysis": {
    "categories": [
      {
        "name": "<Category name e.g. Trend Verbs, Academic Nouns, Comparison Phrases, Cohesive Adverbs>",
        "description": "<What this vocabulary category is and why it matters for IELTS>",
        "words": [
          {
            "word": "<word or multi-word phrase>",
            "definition": "<clear, concise definition>",
            "example": "<example sentence relevant to IELTS writing context>"
          }
        ]
      }
    ]
  },
  "grammar_analysis": {
    "overview_strengths": "<Paragraph summarizing grammatical strengths observed in this specific essay>",
    "overview_weaknesses": "<Paragraph summarizing grammatical weaknesses observed in this specific essay>",
    "structures_used": [
      "<Grammatical structure identified in the essay e.g. Present simple for trends, Comparative adjectives>"
    ],
    "enrichment_suggestions": [
      {
        "original": "<Original sentence or clause from the essay>",
        "improved": "<Improved version demonstrating better grammatical range>",
        "explanation": "<Why this change improves the Grammatical Range and Accuracy band>"
      }
    ],
    "expert_tips": [
      "<Specific, actionable grammar tip tailored to this candidate's observed weaknesses>"
    ]
  },
  "data_structure_analysis": {
    "overview": "<One paragraph assessing overall essay structure, paragraph development, and data/argument coverage>",
    "introduction_strengths": ["<Strength of the introduction>"],
    "introduction_weaknesses": ["<Weakness of the introduction>"],
    "body_analysis": "<Detailed analysis of body paragraph structure, development depth, and data/argument coverage>",
    "conclusion_strengths": ["<Strength of the conclusion>"],
    "conclusion_weaknesses": ["<Weakness of the conclusion>"],
    "task_achievement_rating": "Poor" | "Partial" | "Adequate" | "Good" | "Excellent",
    "task_achievement_feedback": "<Specific feedback on how well the candidate addressed the task requirements>",
    "transition_analysis": "<Analysis of how well transitions and linking devices connect paragraphs and ideas>",
    "authenticity_feedback": "<Feedback on whether the essay sounds natural and genuinely written vs formulaic or memorized>"
  }
}`;
}

// ─── Main grading orchestrator (called async after submission is saved) ────────
async function gradeEssayAsync(submissionId, submissionData) {
  const {
    exam_type,
    task_type,
    essay_content,
    exam_task_id,
    question_text: uploadedQuestionText,
    userId,
    original_credits,
  } = submissionData;
  const word_count = essay_content.trim().split(/\s+/).filter(Boolean).length;

  console.log(`[grader] Starting: submission=${submissionId} task=${exam_type} ${task_type} words=${word_count}`);

  try {
    const bankQuestion = await getQuestionText(exam_task_id);
    const questionText = bankQuestion || uploadedQuestionText || null;

    // ── Call 1: Primary grading ──────────────────────────────────────────────
    const primaryCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: buildPrimaryPrompt(exam_type, task_type, questionText, essay_content, word_count),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4096,
    });

    let primary;
    try {
      primary = JSON.parse(primaryCompletion.choices[0].message.content);
    } catch (parseErr) {
      throw new Error(`Primary grading JSON parse failed: ${parseErr.message}`);
    }

    // Validate and sanitize all band scores
    primary.overall_band   = clampBand(primary.overall_band);
    primary.response_band  = clampBand(primary.response_band);
    primary.coherence_band = clampBand(primary.coherence_band);
    primary.vocabulary_band = clampBand(primary.vocabulary_band);
    primary.grammar_band   = clampBand(primary.grammar_band);
    primary.strengths        = Array.isArray(primary.strengths) ? primary.strengths : [];
    primary.weaknesses       = Array.isArray(primary.weaknesses) ? primary.weaknesses : [];
    primary.high_impact_fixes = Array.isArray(primary.high_impact_fixes) ? primary.high_impact_fixes : [];
    primary.errors           = Array.isArray(primary.errors) ? primary.errors : [];

    // ── Call 2 + 3 (parallel): Deep analysis & secondary grade ──────────────
    const [deepCompletion, secondaryCompletion] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: buildDeepPrompt(exam_type, task_type, questionText, essay_content, primary) }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: buildSecondaryGradePrompt(exam_type, task_type, questionText, essay_content, word_count) }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 256,
      }),
    ]);

    let deep;
    try {
      deep = JSON.parse(deepCompletion.choices[0].message.content);
    } catch (parseErr) {
      console.error('[grader] Deep analysis JSON parse failed:', parseErr.message);
      deep = { model_answer: null, vocabulary_analysis: null, grammar_analysis: null, data_structure_analysis: null };
    }

    let secondaryBands = null;
    try {
      const sec = JSON.parse(secondaryCompletion.choices[0].message.content);
      secondaryBands = {
        model: 'gpt-4o',
        overall_band:   clampBand(sec.overall_band),
        response_band:  clampBand(sec.response_band),
        coherence_band: clampBand(sec.coherence_band),
        vocabulary_band: clampBand(sec.vocabulary_band),
        grammar_band:   clampBand(sec.grammar_band),
      };
    } catch (parseErr) {
      console.error('[grader] Secondary grade JSON parse failed:', parseErr.message);
    }

    // ── Insert report ────────────────────────────────────────────────────────
    const { data: report, error: repError } = await supabaseAdmin
      .from('reports')
      .insert({
        submission_id:         submissionId,
        overall_band:          primary.overall_band,
        response_band:         primary.response_band,
        coherence_band:        primary.coherence_band,
        vocabulary_band:       primary.vocabulary_band,
        grammar_band:          primary.grammar_band,
        strengths:             primary.strengths,
        weaknesses:            primary.weaknesses,
        high_impact_fixes:     primary.high_impact_fixes,
        model_answer:          deep.model_answer || null,
        vocabulary_analysis:   deep.vocabulary_analysis || null,
        grammar_analysis:      deep.grammar_analysis || null,
        data_structure_analysis: deep.data_structure_analysis || null,
        raw_grader_output:     { primary: { ...primary, model: 'gpt-4o-mini' }, deep, secondary_bands: secondaryBands },
      })
      .select('id')
      .single();

    if (repError) {
      throw new Error(`Report insert failed: ${repError.message}`);
    }

    // ── Insert error cards ───────────────────────────────────────────────────
    if (primary.errors.length > 0) {
      const validSeverities = new Set(['Major', 'High', 'Medium', 'Low']);
      const validCriteria   = new Set(['Task Response', 'Coherence & Cohesion', 'Lexical Resource', 'Grammatical Range & Accuracy']);

      const errorRows = primary.errors
        .filter(e => e.original_text && e.correction_text && e.explanation)
        .map(e => ({
          report_id:       report.id,
          title:           (e.title || 'Error').substring(0, 255),
          severity:        validSeverities.has(e.severity) ? e.severity : 'Medium',
          criteria:        validCriteria.has(e.criteria) ? e.criteria : 'Grammatical Range & Accuracy',
          sub_category:    (e.sub_category || 'General').substring(0, 255),
          location_text:   (e.location_text || 'Essay').substring(0, 255),
          original_text:   e.original_text,
          correction_text: e.correction_text,
          explanation:     e.explanation,
        }));

      if (errorRows.length > 0) {
        const { error: errInsertError } = await supabaseAdmin
          .from('report_errors')
          .insert(errorRows);
        if (errInsertError) {
          console.error('[grader] Error cards insert failed:', errInsertError.message);
        }
      }
    }

    // ── Mark submission as graded ────────────────────────────────────────────
    await supabaseAdmin
      .from('submissions')
      .update({ status: 'graded' })
      .eq('id', submissionId);

    console.log(`[grader] Done: submission=${submissionId} band=${primary.overall_band}`);
  } catch (err) {
    console.error(`[grader] Failed: submission=${submissionId}`, err.message);

    // Mark as failed and refund the credit
    await supabaseAdmin
      .from('submissions')
      .update({ status: 'failed' })
      .eq('id', submissionId);

    if (userId && typeof original_credits === 'number') {
      await supabaseAdmin
        .from('profiles')
        .update({ credits_remaining: original_credits })
        .eq('id', userId);
      console.log(`[grader] Credit refunded for user=${userId}`);
    }
  }
}

module.exports = { gradeEssayAsync };
