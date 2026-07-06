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

from learning_validate import CRITERIA_CHAPTERS, CRIT_ALIASES, validate_chapter, validate_learning_content  # noqa: E402

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


def build_chapter_input(dossier: Dict[str, Any], criteria: str) -> Dict[str, Any]:
    agg = dossier.get("aggregated") or {}
    aliases = CRIT_ALIASES.get(criteria, [criteria])
    errors = []
    for alias in aliases:
        errors.extend((agg.get("by_criteria") or {}).get(alias, []))

    payload: Dict[str, Any] = {
        "criteria": criteria,
        "candidate_name": dossier.get("candidate_name"),
        "target_band": dossier.get("target_band"),
        "edition_number": dossier.get("edition_number"),
        "exam_range": dossier.get("exam_range"),
        "recurring_errors": errors[:12],
        "sub_category_scores": agg.get("sub_category_scores") or {},
    }

    if criteria == "Task Response":
        tr = agg.get("task_response") or {}
        payload["weaknesses"] = tr.get("weaknesses", [])[:10]
        payload["high_impact_fixes"] = tr.get("high_impact_fixes", [])[:10]
        payload["strengths"] = tr.get("strengths", [])[:6]
        payload["deep_analysis"] = tr.get("deep_snippets", [])[:5]

    if criteria == "Coherence and Cohesion":
        for exam in dossier.get("exams", []):
            fl = exam.get("flow_logic_analysis")
            if fl:
                payload.setdefault("flow_logic", []).append({
                    "exam_index": exam.get("exam_index"),
                    "analysis": fl,
                })

    if criteria == "Lexical Resource":
        payload["vocabulary"] = agg.get("lexical") or {}
        for exam in dossier.get("exams", []):
            va = exam.get("vocabulary_analysis")
            if va:
                payload.setdefault("vocabulary_by_exam", []).append({
                    "exam_index": exam.get("exam_index"),
                    "categories": (va.get("categories") or [])[:4],
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
      "body": string (3-5 paragraphs with specific examples; use line breaks \\n\\n between paragraphs),
      "student_examples": [
        {"exam_index": number, "original": string, "correction": string, "error_title": string}
      ],
      "source_refs": [{"exam_index": number, "error_title": string}]
    }
  ],
  "micro_lessons": []
}

Rules:
- 3-5 sections targeting the highest-frequency errors for this criterion.
- Each section MUST include at least one student_examples entry from recurring_errors instances.
- Name specific error patterns from the data; never invent essay content.
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
    aliases = CRIT_ALIASES.get(criteria, [criteria])
    errors = []
    for alias in aliases:
        errors.extend((agg.get("by_criteria") or {}).get(alias, []))

    sections = []
    for err in errors[:5]:
        inst = (err.get("instances") or [{}])[0]
        slug = slugify(err.get("title") or "")
        tpl = templates.get(slug)
        body = tpl["body"] if tpl else (
            f"{err.get('explanation') or err.get('title')}. "
            f"Appeared {err.get('count', 1)} times across your exams."
        )
        sections.append({
            "heading": err.get("title") or "Focus area",
            "body": body,
            "student_examples": [{
                "exam_index": inst.get("exam_index"),
                "original": inst.get("original_text") or "",
                "correction": inst.get("correction_text") or "",
                "error_title": err.get("title"),
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
            try:
                ch = await generate_chapter(client, dossier, crit, retry_feedback="; ".join(issues))
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
        "content_version": dossier.get("content_version", 2),
    }


def render_pdf(content: Dict[str, Any], dossier: Dict[str, Any], output_path: str) -> int:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("BookTitle", parent=styles["Title"], fontSize=20, leading=26,
                                   alignment=TA_CENTER, spaceAfter=14, textColor=colors.HexColor("#1a365d"))
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=15, leading=19, spaceBefore=14, spaceAfter=8,
                        textColor=colors.HexColor("#2c5282"))
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, leading=15, spaceBefore=10, spaceAfter=5,
                        textColor=colors.HexColor("#2d3748"))
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=10, leading=14, alignment=TA_JUSTIFY, spaceAfter=6)
    meta = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
    callout = ParagraphStyle("Callout", parent=styles["Normal"], fontSize=9.5, leading=13, leftIndent=12,
                             backColor=colors.HexColor("#f7fafc"), borderPadding=6, spaceAfter=6)
    callout_label = ParagraphStyle("CalloutLabel", parent=callout, fontName="Helvetica-Bold", textColor=colors.HexColor("#c53030"))
    callout_fix = ParagraphStyle("CalloutFix", parent=callout, textColor=colors.HexColor("#276749"))

    story = []
    overview = content.get("overview") or {}

    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(overview.get("title") or "Personalized Learning Guide", title_style))
    story.append(Paragraph(
        f"{overview.get('candidate_name', 'Candidate')} · Exams {overview.get('exam_range', {}).get('start')}–"
        f"{overview.get('exam_range', {}).get('end')}",
        meta,
    ))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph((overview.get("summary") or "").replace("\n", "<br/>"), body))

    for focus in overview.get("priority_focus") or []:
        story.append(Paragraph(f"• {focus}", body))

    preview = dossier.get("preview") or {}
    bands = preview.get("avgBands") or {}
    if bands.get("overall") is not None:
        parts = [f"Overall {bands['overall']:.1f}"]
        for k, label in [("response", "TR"), ("coherence", "CC"), ("vocabulary", "LR"), ("grammar", "GRA")]:
            if bands.get(k) is not None:
                parts.append(f"{label} {bands[k]:.1f}")
        story.append(Paragraph(" · ".join(parts), meta))

    story.append(PageBreak())

    for ch in content.get("chapters") or []:
        story.append(Paragraph(ch.get("criteria") or "Chapter", h1))

        for sec in ch.get("sections") or []:
            story.append(Paragraph(sec.get("heading") or "Section", h2))
            story.append(Paragraph((sec.get("body") or "").replace("\n", "<br/>"), body))

            for ex in sec.get("student_examples") or []:
                if ex.get("original"):
                    story.append(Paragraph("Your writing:", callout_label))
                    story.append(Paragraph(ex.get("original", "").replace("\n", " "), callout))
                if ex.get("correction"):
                    story.append(Paragraph("Better version:", callout_fix))
                    story.append(Paragraph(ex.get("correction", "").replace("\n", " "), callout))

        for lesson in ch.get("micro_lessons") or []:
            story.append(Paragraph(lesson.get("title") or "Micro-lesson", h2))
            if lesson.get("rule"):
                story.append(Paragraph(f"<b>Rule:</b> {lesson['rule']}", body))
            for item in lesson.get("when_to_use") or []:
                story.append(Paragraph(f"• {item}", body))
            for mistake in lesson.get("your_mistakes") or []:
                story.append(Paragraph(
                    f"<b>Exam {mistake.get('exam_index')}:</b> {mistake.get('original', '')} → {mistake.get('fix', '')}",
                    callout,
                ))
            for ex in lesson.get("example_sentences") or []:
                if ex:
                    story.append(Paragraph(f"Example: {ex}", callout))
            story.append(Paragraph("<b>Practice:</b>", body))
            for ex in lesson.get("mini_exercises") or []:
                story.append(Paragraph(f"• {ex}", body))

        story.append(PageBreak())

    story.append(Paragraph("Practice Plan", h1))
    plan = content.get("practice_plan") or {}
    for i, step in enumerate(plan.get("steps") or [], 1):
        story.append(Paragraph(f"{i}. {step}", body))

    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph(
        f"Generated {datetime.utcnow().strftime('%Y-%m-%d')} · IELTS Grader · Edition {overview.get('edition_number', '')}",
        meta,
    ))

    doc.build(story)
    return max(14, min(22, 6 + sum(len(ch.get("sections") or []) + len(ch.get("micro_lessons") or []) for ch in content.get("chapters") or [])))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dossier", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = asyncio.run(main_async(args.dossier, args.output))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
