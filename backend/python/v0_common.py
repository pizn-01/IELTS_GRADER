#!/usr/bin/env python3
"""
v0_common.py — IELTS grading engine core.

=== MODIFIED FOR IELTS GRADER INTEGRATION — READ BEFORE EDITING ===

This file originally shipped from the client's Ielts-v0 repository as a
"v0 compatibility" stub: every function returned hardcoded placeholder
values (fixed 6.0 band scores, static feedback text like "Stable v0
grammar analysis (lightweight mode)") so the surrounding pipeline
(server.js, HTML front-ends, admin tools) could be wired up and tested
end-to-end before the real grading logic existed. No OpenAI calls were
made anywhere in the original file.

WHAT WE CHANGED AND WHY:

  1. Replaced every hardcoded placeholder (_base_breakdown, _grammar_payload,
     _vocabulary_payload, _revision_payload, _flow_logic_payload,
     _argumentation_payload, _letter_structure_payload,
     _data_structure_payload — all removed) with real OpenAI Chat
     Completions calls that actually grade the candidate's writing against
     official IELTS band descriptors.

  2. Changed the JSON shape build_report() returns. The original v0 schema
     (score/breakdown/flow_logic_analysis/argumentation_analysis/etc.) did
     not match anything our Node backend or database expected. The new
     shape matches the exact contract our Supabase `reports` table and the
     existing report UI already use (overall_band, response_band,
     strengths, weaknesses, errors, model_answer, vocabulary_analysis,
     grammar_analysis, data_structure_analysis) — this was a deliberate
     choice so the frontend needed ZERO changes to support this engine.
     See backend/src/services/pythonGrader.js for how this output is
     consumed and written to the database.

  3. Added a 3-call grading pipeline — a primary detailed grade, an
     independent secondary "second opinion" grade (cross-checking model),
     and a deep-analysis pass (model answer + vocabulary + grammar +
     structure feedback) — matching the grading depth of the JS grading
     engine this Python engine replaces (see backend/src/services/grader.js,
     kept in the codebase as a fallback engine).

  4. build_report() keeps the SAME function signature the original stub
     used: task, exam_name, prompt, user_answer, bullet_points,
     letter_type, opening_line, chart_type. This means AnswerGrader.py,
     Task1LetterGrader.py, and Task1ReportGrader.py did not need to change
     how they call it — only this file's internals changed.

  5. Chart images (Task 1 Report) are NOT sent to a vision model in this
     version — chart_image_file is still accepted by Task1ReportGrader.py
     for forward compatibility, but the actual grading is currently
     text-only (grading is based on the prompt + chart_type + the
     candidate's written answer). Wiring up real chart-image analysis
     would mean switching the primary call to a vision-capable model and
     attaching the image — left as a clearly-flagged future enhancement.

Everything below this comment is new code, not present in the original
stub.
"""

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import OpenAI

# Loads backend/.env (or backend/python/.env) when a script is run directly.
# When invoked from Node (the normal path), OPENAI_API_KEY is already set
# in the environment the child process inherits, so this is a no-op then.
load_dotenv()

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set.")
        _client = OpenAI(api_key=api_key)
    return _client


def _word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text or ""))


def _clamp_band(raw: Any) -> float:
    """Clamp a raw score to a valid IELTS 0.5-increment band (1.0-9.0)."""
    try:
        num = float(raw)
    except (TypeError, ValueError):
        return 5.0
    clamped = min(9.0, max(1.0, num))
    return round(clamped * 2) / 2


def _task_guidance(task: str, chart_type: str = "", letter_type: str = "") -> str:
    if task == "task1-letter":
        tone = letter_type or "formal"
        return (
            f"This is IELTS General Training Writing Task 1. The candidate must write a "
            f"{tone} letter responding to a given situation. Minimum 150 words."
        )
    if task == "task1-report":
        chart = chart_type or "chart"
        return (
            f"This is IELTS Academic Writing Task 1. The candidate must summarize, describe, "
            f"or explain information from a {chart}. Minimum 150 words."
        )
    return (
        "This is IELTS Writing Task 2. The candidate must write a discursive essay in "
        "response to a point of view, argument, or problem. Minimum 250 words."
    )


# ─── PROMPT 1: Primary grading (bands + errors + strengths/weaknesses) ────────
def _build_primary_prompt(
    task: str,
    prompt: str,
    user_answer: str,
    word_count: int,
    chart_type: str,
    letter_type: str,
    bullet_points: List[str],
    opening_line: str,
) -> str:
    guidance = _task_guidance(task, chart_type, letter_type)

    extra = ""
    if task == "task1-letter" and bullet_points:
        bullets_text = "\n".join(f"- {b}" for b in bullet_points)
        extra += f"REQUIRED POINTS TO COVER:\n{bullets_text}\n\n"
    if task == "task1-letter" and opening_line:
        extra += f"SUGGESTED OPENING LINE (the candidate may use a different one): {opening_line}\n\n"

    return f"""You are a certified IELTS examiner with 20+ years of experience. Grade the answer below strictly and honestly using official IELTS band descriptors.

{guidance}

QUESTION / PROMPT:
{prompt}

{extra}CANDIDATE ANSWER ({word_count} words):
{user_answer}

Return ONLY a valid JSON object. Use the full 1.0-9.0 band scale in 0.5 increments. Be accurate — most candidates score between 4.0 and 7.5.

{{
  "overall_band": <average of 4 criteria bands, rounded to nearest 0.5>,
  "response_band": <Task Response / Task Achievement band>,
  "coherence_band": <Coherence and Cohesion band>,
  "vocabulary_band": <Lexical Resource band>,
  "grammar_band": <Grammatical Range and Accuracy band>,
  "strengths": [<3-5 concise, specific strengths observed in this answer>],
  "weaknesses": [<3-5 concise, specific weaknesses that lowered the band score>],
  "high_impact_fixes": [
    {{
      "issue": "<concise name of the issue>",
      "suggestion": "<specific, actionable fix>",
      "impact": "High" | "Medium" | "Low"
    }}
  ],
  "errors": [
    {{
      "title": "<short descriptive error title>",
      "severity": "Major" | "High" | "Medium" | "Low",
      "criteria": "Task Response" | "Coherence & Cohesion" | "Lexical Resource" | "Grammatical Range & Accuracy",
      "sub_category": "<e.g. Word Choice, Data Accuracy, Coverage, Range, Structure, Referencing, Accuracy, Punctuation, Development, Cohesive Devices, Comparison>",
      "location_text": "<e.g. Paragraph 2, Sentence 1>",
      "original_text": "<exact problematic excerpt from the answer (keep short)>",
      "correction_text": "<corrected version of that excerpt>",
      "explanation": "<clear explanation of why this is an error and how the correction improves the score>"
    }}
  ],
  "sub_category_scores": {{
    "Task Response": [
      {{ "name": "<sub-category>", "band": <1.0-9.0 in 0.5 increments>, "strength": "<one specific observed strength>", "weakness": "<one specific observed weakness>" }}
    ],
    "Coherence & Cohesion": [
      {{ "name": "<sub-category>", "band": <1.0-9.0>, "strength": "<strength>", "weakness": "<weakness>" }}
    ],
    "Lexical Resource": [
      {{ "name": "<sub-category>", "band": <1.0-9.0>, "strength": "<strength>", "weakness": "<weakness>" }}
    ],
    "Grammatical Range & Accuracy": [
      {{ "name": "<sub-category>", "band": <1.0-9.0>, "strength": "<strength>", "weakness": "<weakness>" }}
    ]
  }}
}}

Provide 6-14 errors covering a realistic range of severity. For "Major" errors, mark issues that alone can drop a band score. Be specific about location. Do not include errors that are not actually present in the answer. For sub_category_scores, include 4-6 sub-categories per criterion, with band scores consistent with the criterion's overall band."""


# ─── PROMPT 2: Secondary grade (dual assessment — second model opinion) ──────
def _build_secondary_prompt(
    task: str, prompt: str, user_answer: str, word_count: int, chart_type: str, letter_type: str
) -> str:
    guidance = _task_guidance(task, chart_type, letter_type)
    return f"""You are a certified IELTS examiner. Grade the answer below using official IELTS band descriptors. Be independent — do not replicate another examiner's grade, form your own assessment.

{guidance}

QUESTION:
{prompt}

ANSWER ({word_count} words):
{user_answer}

Return ONLY a valid JSON object. Use the full 1.0-9.0 band scale in 0.5 increments.

{{
  "overall_band": <average of 4 criteria bands, rounded to nearest 0.5>,
  "response_band": <Task Response / Task Achievement band>,
  "coherence_band": <Coherence and Cohesion band>,
  "vocabulary_band": <Lexical Resource band>,
  "grammar_band": <Grammatical Range and Accuracy band>
}}"""


# ─── PROMPT 3: Deep analysis (model answer + vocabulary + grammar + structure) ─
def _build_deep_prompt(task: str, prompt: str, user_answer: str, primary: Dict[str, Any]) -> str:
    word_range = "260-310 words" if task == "task2" else "165-185 words"
    return f"""You are a certified IELTS examiner and writing coach. Based on this graded answer, produce a deep analysis.

QUESTION / PROMPT:
{prompt}

CANDIDATE ANSWER:
{user_answer}

GRADING SUMMARY: Overall Band {primary['overall_band']} | TR {primary['response_band']} | CC {primary['coherence_band']} | LR {primary['vocabulary_band']} | GRA {primary['grammar_band']}

Return ONLY a valid JSON object with this exact structure:

{{
  "model_answer": {{
    "text": "<Complete model answer for the same prompt at Band 8.0 level. Write all paragraphs fully. {word_range}.>",
    "estimated_band": 8.0,
    "key_changes": ["<Change 1 — what was improved vs the candidate answer and why>", "<Change 2>", "<Change 3>", "<Change 4>", "<Change 5>"]
  }},
  "vocabulary_analysis": {{
    "categories": [
      {{
        "name": "<Category name e.g. Trend Verbs, Academic Nouns, Comparison Phrases, Cohesive Adverbs>",
        "description": "<What this vocabulary category is and why it matters for IELTS>",
        "words": [
          {{ "word": "<word or multi-word phrase>", "definition": "<clear, concise definition>", "example": "<example sentence relevant to IELTS writing context>" }}
        ]
      }}
    ]
  }},
  "grammar_analysis": {{
    "overview_strengths": "<Paragraph summarizing grammatical strengths observed in this specific answer>",
    "overview_weaknesses": "<Paragraph summarizing grammatical weaknesses observed in this specific answer>",
    "structures_used": ["<Grammatical structure identified in the answer e.g. Present simple for trends, Comparative adjectives>"],
    "enrichment_suggestions": [
      {{ "original": "<Original sentence or clause from the answer>", "improved": "<Improved version demonstrating better grammatical range>", "explanation": "<Why this change improves the Grammatical Range and Accuracy band>" }}
    ],
    "expert_tips": ["<Specific, actionable grammar tip tailored to this candidate's observed weaknesses>"]
  }},
  "data_structure_analysis": {{
    "overview": "<One paragraph assessing overall answer structure, paragraph development, and data/argument coverage>",
    "introduction_strengths": ["<Strength of the introduction>"],
    "introduction_weaknesses": ["<Weakness of the introduction>"],
    "body_analysis": "<Detailed analysis of body paragraph structure, development depth, and data/argument coverage>",
    "conclusion_strengths": ["<Strength of the conclusion>"],
    "conclusion_weaknesses": ["<Weakness of the conclusion>"],
    "task_achievement_rating": "Poor" | "Partial" | "Adequate" | "Good" | "Excellent",
    "task_achievement_feedback": "<Specific feedback on how well the candidate addressed the task requirements>",
    "transition_analysis": "<Analysis of how well transitions and linking devices connect paragraphs and ideas>",
    "authenticity_feedback": "<Feedback on whether the answer sounds natural and genuinely written vs formulaic or memorized>"
  }}
}}"""


def _chat_json(model: str, content: str, temperature: float, max_tokens: int) -> Dict[str, Any]:
    client = _get_client()
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_object"},
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return json.loads(completion.choices[0].message.content)


def build_report(
    task: str,
    exam_name: str,
    prompt: str,
    user_answer: str,
    bullet_points: Optional[List[str]] = None,
    letter_type: str = "",
    opening_line: str = "",
    chart_type: str = "",
) -> Dict[str, Any]:
    bullet_points = bullet_points or []
    word_count = _word_count(user_answer)

    # ── Call 1: Primary grading (must complete first — call 3 depends on it) ──
    primary_prompt = _build_primary_prompt(
        task, prompt, user_answer, word_count, chart_type, letter_type, bullet_points, opening_line
    )
    primary_raw = _chat_json("gpt-4o-mini", primary_prompt, temperature=0.2, max_tokens=4096)

    primary = {
        "overall_band": _clamp_band(primary_raw.get("overall_band")),
        "response_band": _clamp_band(primary_raw.get("response_band")),
        "coherence_band": _clamp_band(primary_raw.get("coherence_band")),
        "vocabulary_band": _clamp_band(primary_raw.get("vocabulary_band")),
        "grammar_band": _clamp_band(primary_raw.get("grammar_band")),
        "strengths": primary_raw.get("strengths") if isinstance(primary_raw.get("strengths"), list) else [],
        "weaknesses": primary_raw.get("weaknesses") if isinstance(primary_raw.get("weaknesses"), list) else [],
        "high_impact_fixes": primary_raw.get("high_impact_fixes")
        if isinstance(primary_raw.get("high_impact_fixes"), list)
        else [],
        "errors": primary_raw.get("errors") if isinstance(primary_raw.get("errors"), list) else [],
        "sub_category_scores": primary_raw.get("sub_category_scores")
        if isinstance(primary_raw.get("sub_category_scores"), dict)
        else {},
    }

    # ── Calls 2 + 3 (parallel): deep analysis & independent secondary grade ──
    deep_prompt = _build_deep_prompt(task, prompt, user_answer, primary)
    secondary_prompt = _build_secondary_prompt(task, prompt, user_answer, word_count, chart_type, letter_type)

    deep_raw: Dict[str, Any] = {}
    secondary_bands: Optional[Dict[str, Any]] = None

    with ThreadPoolExecutor(max_workers=2) as pool:
        deep_future = pool.submit(_chat_json, "gpt-4o-mini", deep_prompt, 0.3, 4096)
        secondary_future = pool.submit(_chat_json, "gpt-4o", secondary_prompt, 0.2, 256)

        try:
            deep_raw = deep_future.result()
        except Exception as exc:  # noqa: BLE001 - deep analysis failure is non-fatal, same as grader.js
            print(f"[v0_common] Deep analysis failed: {exc}", flush=True)
            deep_raw = {}

        try:
            secondary_raw = secondary_future.result()
            secondary_bands = {
                "model": "gpt-4o",
                "overall_band": _clamp_band(secondary_raw.get("overall_band")),
                "response_band": _clamp_band(secondary_raw.get("response_band")),
                "coherence_band": _clamp_band(secondary_raw.get("coherence_band")),
                "vocabulary_band": _clamp_band(secondary_raw.get("vocabulary_band")),
                "grammar_band": _clamp_band(secondary_raw.get("grammar_band")),
            }
        except Exception as exc:  # noqa: BLE001 - secondary opinion failure is non-fatal, same as grader.js
            print(f"[v0_common] Secondary grade failed: {exc}", flush=True)
            secondary_bands = None

    report: Dict[str, Any] = {
        "overall_band": primary["overall_band"],
        "response_band": primary["response_band"],
        "coherence_band": primary["coherence_band"],
        "vocabulary_band": primary["vocabulary_band"],
        "grammar_band": primary["grammar_band"],
        "strengths": primary["strengths"],
        "weaknesses": primary["weaknesses"],
        "high_impact_fixes": primary["high_impact_fixes"],
        "errors": primary["errors"],
        "sub_category_scores": primary["sub_category_scores"],
        "model_answer": deep_raw.get("model_answer"),
        "vocabulary_analysis": deep_raw.get("vocabulary_analysis"),
        "grammar_analysis": deep_raw.get("grammar_analysis"),
        "data_structure_analysis": deep_raw.get("data_structure_analysis"),
        "secondary_bands": secondary_bands,
        "meta": {
            "engine": "python-v1",
            "task": task,
            "exam_name": exam_name,
            "word_count": word_count,
            "bullet_points": bullet_points,
            "letter_type": letter_type,
            "chart_type": chart_type,
        },
    }
    return report
