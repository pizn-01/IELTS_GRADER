#!/usr/bin/env python3
"""
Multi-pass Personalized Learning PDF generator.
Usage: python generate_learning_material.py --dossier path.json --output out.pdf
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

from learning_validate import (  # noqa: E402
    CRITERIA_CHAPTERS,
    CRIT_ALIASES,
    get_mandatory_titles_for_criteria,
    validate_chapter,
    validate_learning_content,
)

MODEL = os.environ.get("LEARNING_MODEL", "gpt-5.2")
TEMPERATURE = 0.2
TEMPLATES_PATH = Path(__file__).parent / "learning_templates" / "fallbacks.json"


def load_dossier(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_templates() -> Dict[str, Any]:
    if TEMPLATES_PATH.exists():
        with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")
    return s[:60] or "unknown"


def _get_model_config(model: str) -> Dict[str, Any]:
    if model.startswith("gpt-5"):
        return {"temperature": 1.0, "max_completion_tokens": 16000, "json_mode": True}
    return {"temperature": TEMPERATURE, "max_tokens": 8000, "json_mode": True}


async def _call_json(client, system: str, user: str, model: str = MODEL) -> Dict[str, Any]:
    cfg = _get_model_config(model)
    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if cfg["json_mode"]:
        kwargs["response_format"] = {"type": "json_object"}
    if model.startswith("gpt-5"):
        kwargs["max_completion_tokens"] = cfg["max_completion_tokens"]
        kwargs["temperature"] = cfg["temperature"]
    else:
        kwargs["max_tokens"] = cfg["max_tokens"]
        kwargs["temperature"] = cfg["temperature"]

    response = await client.chat.completions.create(**kwargs)
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


def select_errors_for_chapter(agg: Dict[str, Any], criteria: str, min_count: int = 2) -> List[Dict[str, Any]]:
    """Include all frequent errors for criterion + singles needed to cover each task type."""
    aliases = CRIT_ALIASES.get(criteria, [criteria])
    by_crit = agg.get("by_criteria") or {}
    errors: List[Dict[str, Any]] = []
    seen_keys: set = set()

    for alias in aliases:
        for err in by_crit.get(alias, []):
            key = f"{err.get('title')}::{err.get('sub_category') or ''}"
            if key not in seen_keys:
                seen_keys.add(key)
                errors.append(err)

    frequent = [e for e in errors if (e.get("count") or 0) >= min_count]
    singles = [e for e in errors if (e.get("count") or 0) < min_count]

    tasks_in_edition = agg.get("tasks_in_edition") or []
    task_labels = [t.get("label") for t in tasks_in_edition if t.get("label")]

    covered_tasks: set = set()
    for err in frequent:
        for tl in err.get("task_labels") or []:
            covered_tasks.add(tl)

    extras: List[Dict[str, Any]] = []
    for tl in task_labels:
        if tl in covered_tasks:
            continue
        for err in singles:
            if tl in (err.get("task_labels") or []):
                extras.append(err)
                covered_tasks.add(tl)
                break

    selected = frequent + extras
    return selected if selected else errors


def build_chapter_input(dossier: Dict[str, Any], criteria: str) -> Dict[str, Any]:
    agg = dossier.get("aggregated") or {}
    errors = select_errors_for_chapter(agg, criteria)
    mandatory_errors = get_mandatory_titles_for_criteria(agg, criteria)
    tasks_in_edition = agg.get("tasks_in_edition") or []
    errors_by_task = agg.get("errors_by_task") or {}
    deep_analysis_by_task = agg.get("deep_analysis_by_task") or {}

    payload: Dict[str, Any] = {
        "criteria": criteria,
        "candidate_name": dossier.get("candidate_name"),
        "target_band": dossier.get("target_band"),
        "edition_number": dossier.get("edition_number"),
        "exam_range": dossier.get("exam_range"),
        "tasks_in_edition": tasks_in_edition,
        "errors_by_task": {
            k: [{"title": e.get("title"), "count": e.get("count"), "criteria": e.get("criteria")}
                for e in v[:20]]
            for k, v in errors_by_task.items()
        },
        "recurring_errors": errors,
        "mandatory_errors": mandatory_errors,
        "sub_category_scores": agg.get("sub_category_scores") or {},
    }

    if criteria == "Task Response":
        tr = agg.get("task_response") or {}
        payload["weaknesses"] = tr.get("weaknesses", [])
        payload["high_impact_fixes"] = tr.get("high_impact_fixes", [])
        payload["strengths"] = tr.get("strengths", [])
        payload["deep_analysis"] = tr.get("deep_snippets", [])
        payload["deep_analysis_by_task"] = deep_analysis_by_task
        for exam in dossier.get("exams", []):
            task_label = f"{exam.get('exam_type')} {exam.get('task_type')}".strip()
            for field in ("argumentation_analysis", "data_structure_analysis", "letter_structure_analysis"):
                val = exam.get(field)
                if val:
                    payload.setdefault("task_specific_analysis", []).append({
                        "exam_index": exam.get("exam_index"),
                        "task_label": task_label,
                        "type": field.replace("_analysis", ""),
                        "analysis": val,
                    })

    if criteria == "Coherence and Cohesion":
        payload["deep_analysis_by_task"] = deep_analysis_by_task
        for exam in dossier.get("exams", []):
            fl = exam.get("flow_logic_analysis")
            if fl:
                task_label = f"{exam.get('exam_type')} {exam.get('task_type')}".strip()
                payload.setdefault("flow_logic", []).append({
                    "exam_index": exam.get("exam_index"),
                    "task_label": task_label,
                    "analysis": fl,
                })

    if criteria == "Lexical Resource":
        payload["vocabulary"] = agg.get("lexical") or {}
        for exam in dossier.get("exams", []):
            va = exam.get("vocabulary_analysis")
            if va:
                task_label = f"{exam.get('exam_type')} {exam.get('task_type')}".strip()
                payload.setdefault("vocabulary_by_exam", []).append({
                    "exam_index": exam.get("exam_index"),
                    "task_label": task_label,
                    "categories": va.get("categories") or [],
                })

    if criteria == "Grammatical Range and Accuracy":
        payload["grammar"] = agg.get("grammar") or {}

    payload["exam_summaries"] = [
        {
            "exam_index": e.get("exam_index"),
            "task": f"{e.get('exam_type')} {e.get('task_type')}",
            "bands": {
                "overall": e.get("overall_band"),
                "grammar": e.get("grammar_band"),
            },
            "essay_excerpt": (e.get("essay_excerpt") or "")[:1500],
        }
        for e in dossier.get("exams", [])
    ]

    return payload


CHAPTER_SYSTEM = """You are an expert IELTS Writing teacher creating ONE chapter of a personalized remediation guide.
You must use ONLY data from the input JSON. Quote the student's actual original_text and correction_text from error instances.

Output JSON:
{
  "criteria": "<criterion name>",
  "sections": [
    {
      "heading": string,
      "body": string (2-4 paragraphs with specific examples; use line breaks \\n\\n between paragraphs),
      "error_count": number (optional, from recurring_errors count),
      "task_label": string (optional, e.g. "Academic Task 1"),
      "student_examples": [
        {"exam_index": number, "original": string, "correction": string, "error_title": string, "task_label": string}
      ],
      "source_refs": [{"exam_index": number, "error_title": string}]
    }
  ],
  "micro_lessons": []
}

Rules:
- This edition includes exams listed in tasks_in_edition. You MUST address mistakes from EACH task type that has errors in recurring_errors or errors_by_task. Label examples with task type (e.g. "Academic Task 1, Exam 12").
- Do not focus only on one task type.
- Every error in mandatory_errors MUST appear in exactly one section with a quoted student example and a matching source_ref error_title. Do not skip any mandatory error.
- Create one section per mandatory error (group only if errors are nearly identical). For non-mandatory errors, add sections as needed for task coverage.
- Each section MUST include at least one student_examples entry from recurring_errors instances.
- Name specific error patterns from the data; never invent essay content.
- Include error_count and task_label on each section when available from the data.
- Tone: direct, teacher-like, actionable.
- For Grammar chapter: leave micro_lessons empty (added in a separate pass)."""


GRAMMAR_LESSONS_SYSTEM = """You are an IELTS grammar teacher. Create micro-lessons for structures the student was SUGGESTED but did NOT USE.

Output JSON:
{
  "micro_lessons": [
    {
      "title": string,
      "source_enrichment": string (must match an unused enrichment original),
      "rule": string (2-3 sentences),
      "when_to_use": [string, string],
      "your_mistakes": [{"exam_index": number, "original": string, "fix": string}],
      "mini_exercises": [string, string],
      "example_sentences": [string, string]
    }
  ]
}

Create exactly one micro-lesson per unused enrichment provided (up to 3). Each must be a short focused course (~1 page) with real student grammar errors where available."""


OVERVIEW_SYSTEM = """Polish the overview and practice plan for a personalized IELTS study guide.

Output JSON:
{
  "overview": {
    "title": string,
    "edition_number": number,
    "candidate_name": string,
    "exam_range": {"start": number, "end": number},
    "summary": string (3-4 sentences, specific to data),
    "priority_focus": [string, string, string]
  },
  "practice_plan": {
    "steps": [string, string, string, string]
  }
}

Ground every point in the chapter summaries provided. No invented scores."""


async def generate_chapter(client, dossier: Dict[str, Any], criteria: str, retry_feedback: str = "") -> Dict[str, Any]:
    payload = build_chapter_input(dossier, criteria)
    user = f"Create the {criteria} chapter from:\n\n{json.dumps(payload, ensure_ascii=False)}"
    if retry_feedback:
        user += f"\n\nFix these validation issues:\n{retry_feedback}"

    result = await _call_json(client, CHAPTER_SYSTEM, user)
    result["criteria"] = criteria
    return result


async def generate_grammar_lessons(client, dossier: Dict[str, Any]) -> List[Dict]:
    agg = dossier.get("aggregated") or {}
    grammar = agg.get("grammar") or {}
    unused = grammar.get("unused_enrichments") or []
    if not unused:
        return []

    payload = {
        "unused_enrichments": unused,
        "recurring_grammar_errors": grammar.get("recurring_errors", [])[:10],
        "structures_used": grammar.get("structures_used", []),
    }
    user = f"Create micro-lessons from:\n\n{json.dumps(payload, ensure_ascii=False)}"
    result = await _call_json(client, GRAMMAR_LESSONS_SYSTEM, user)
    return result.get("micro_lessons") or []


async def generate_overview(client, dossier: Dict[str, Any], chapters: List[Dict]) -> Dict[str, Any]:
    summary = {
        "candidate_name": dossier.get("candidate_name"),
        "target_band": dossier.get("target_band"),
        "edition_number": dossier.get("edition_number"),
        "exam_range": dossier.get("exam_range"),
        "preview": dossier.get("preview"),
        "chapter_headings": [
            {"criteria": ch.get("criteria"), "sections": [s.get("heading") for s in ch.get("sections", [])]}
            for ch in chapters
        ],
    }
    user = f"Write overview and practice plan:\n\n{json.dumps(summary, ensure_ascii=False)}"
    return await _call_json(client, OVERVIEW_SYSTEM, user)


def template_chapter(dossier: Dict[str, Any], criteria: str) -> Dict[str, Any]:
    templates = load_templates()
    agg = dossier.get("aggregated") or {}
    errors = select_errors_for_chapter(agg, criteria)
    mandatory = get_mandatory_titles_for_criteria(agg, criteria)

    def _norm_title(t: str) -> str:
        return re.sub(r"\s+", " ", (t or "").strip().lower())

    mandatory_norm = {_norm_title(t) for t in mandatory}

    # Cover mandatory errors first, then others
    ordered = []
    seen = set()
    for err in errors:
        title = err.get("title") or ""
        n = _norm_title(title)
        if n in mandatory_norm and n not in seen:
            ordered.append(err)
            seen.add(n)
    for err in errors:
        title = err.get("title") or ""
        n = _norm_title(title)
        if n not in seen:
            ordered.append(err)
            seen.add(n)

    sections = []
    for err in ordered:
        inst = (err.get("instances") or [{}])[0]
        slug = slugify(err.get("title") or "")
        tpl = templates.get(slug)
        body = tpl["body"] if tpl else (
            f"{err.get('explanation') or err.get('title')}. "
            f"Appeared {err.get('count', 1)} times across your exams."
        )
        task_label = inst.get("task_label") or ((err.get("task_labels") or [None])[0])
        sections.append({
            "heading": err.get("title") or "Focus area",
            "body": body,
            "error_count": err.get("count"),
            "task_label": task_label,
            "student_examples": [{
                "exam_index": inst.get("exam_index"),
                "original": inst.get("original_text") or "",
                "correction": inst.get("correction_text") or "",
                "error_title": err.get("title"),
                "task_label": task_label,
            }] if inst.get("original_text") else [],
            "source_refs": [{"exam_index": inst.get("exam_index"), "error_title": err.get("title")}],
        })

    if not sections:
        sections.append({
            "heading": "Maintain consistency",
            "body": "No major recurring issues in this criterion. Keep practicing across task types.",
            "student_examples": [],
            "source_refs": [],
        })

    chapter = {"criteria": criteria, "sections": sections, "micro_lessons": []}

    if criteria == "Grammatical Range and Accuracy":
        for enr in (agg.get("grammar") or {}).get("unused_enrichments", [])[:3]:
            chapter["micro_lessons"].append({
                "title": enr.get("original") or "Grammar focus",
                "source_enrichment": enr.get("original"),
                "rule": enr.get("explanation") or "",
                "when_to_use": ["In formal academic writing", "When contrasting time periods"],
                "your_mistakes": [],
                "mini_exercises": ["Rewrite one body paragraph using this structure."],
                "example_sentences": [enr.get("improved") or ""],
            })

    return chapter


async def main_async(dossier_path: str, output_path: str) -> Dict[str, Any]:
    import openai

    dossier = load_dossier(dossier_path)
    client = openai.AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    used_fallback = False

    chapters: List[Dict[str, Any]] = []
    chapter_tasks = [generate_chapter(client, dossier, crit) for crit in CRITERIA_CHAPTERS]
    raw_chapters = await asyncio.gather(*chapter_tasks, return_exceptions=True)

    for i, crit in enumerate(CRITERIA_CHAPTERS):
        ch = raw_chapters[i]
        if isinstance(ch, Exception):
            print(f"[generate_learning_material] Chapter {crit} failed: {ch}", file=sys.stderr)
            chapters.append(template_chapter(dossier, crit))
            used_fallback = True
            continue

        ok, issues = validate_chapter(ch, dossier, crit)
        if not ok:
            print(f"[generate_learning_material] {crit} validation failed, retrying: {issues}", file=sys.stderr)
            agg = dossier.get("aggregated") or {}
            mandatory = get_mandatory_titles_for_criteria(agg, crit)
            extra = ""
            if mandatory:
                extra = f"\n\nYou MUST include these mandatory errors: {json.dumps(mandatory)}"
            try:
                ch = await generate_chapter(
                    client, dossier, crit,
                    retry_feedback="; ".join(issues) + extra,
                )
                ok, issues = validate_chapter(ch, dossier, crit)
            except Exception as exc:
                print(f"[generate_learning_material] {crit} retry failed: {exc}", file=sys.stderr)
                ok = False

        if not ok:
            chapters.append(template_chapter(dossier, crit))
            used_fallback = True
        else:
            chapters.append(ch)

    grammar_ch = next((c for c in chapters if c["criteria"] == "Grammatical Range and Accuracy"), None)
    if grammar_ch is not None:
        try:
            lessons = await generate_grammar_lessons(client, dossier)
            if lessons:
                grammar_ch["micro_lessons"] = lessons[:3]
        except Exception as exc:
            print(f"[generate_learning_material] grammar lessons failed: {exc}", file=sys.stderr)
            if not grammar_ch.get("micro_lessons"):
                grammar_ch["micro_lessons"] = template_chapter(dossier, "Grammatical Range and Accuracy").get("micro_lessons", [])

    try:
        overview_data = await generate_overview(client, dossier, chapters)
        overview = overview_data.get("overview") or {}
        practice_plan = overview_data.get("practice_plan") or {}
    except Exception as exc:
        print(f"[generate_learning_material] overview failed: {exc}", file=sys.stderr)
        overview = {
            "title": f"Personalized Learning — Edition {dossier.get('edition_number')}",
            "edition_number": dossier.get("edition_number"),
            "candidate_name": dossier.get("candidate_name"),
            "exam_range": dossier.get("exam_range"),
            "summary": f"Remediation guide from exams {dossier['exam_range']['start']}–{dossier['exam_range']['end']}.",
            "priority_focus": [],
        }
        practice_plan = {"steps": [
            "Review flagged errors from each exam.",
            "Write one paragraph targeting your weakest criterion.",
            "Submit a new practice essay and compare error frequency.",
        ]}

    content = {"overview": overview, "chapters": chapters, "practice_plan": practice_plan}
    ok, issues = validate_learning_content(content, dossier)
    if not ok:
        print(f"[generate_learning_material] final validation warnings: {issues}", file=sys.stderr)

    page_count = render_pdf(content, dossier, output_path)
    return {
        "success": True,
        "pdf_path": output_path,
        "page_count": page_count,
        "used_fallback": used_fallback,
        "content_version": dossier.get("content_version", 3),
    }


def render_pdf(content: Dict[str, Any], dossier: Dict[str, Any], output_path: str) -> int:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate

    from learning_pdf_theme import (
        build_body_story,
        build_cover_story,
        build_styles,
        make_page_callbacks,
    )

    overview = content.get("overview") or {}
    styles = build_styles()
    on_first_page, on_page = make_page_callbacks(overview)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    story = []
    story.extend(build_cover_story(overview, dossier, styles))
    story.extend(build_body_story(content, dossier, styles))

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_page)

    section_count = sum(
        len(ch.get("sections") or []) + len(ch.get("micro_lessons") or [])
        for ch in content.get("chapters") or []
    )
    return max(14, min(40, 8 + section_count))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dossier", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = asyncio.run(main_async(args.dossier, args.output))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
