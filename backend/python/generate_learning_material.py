#!/usr/bin/env python3
"""
Generate Personalized Learning PDF from a dossier JSON file.
Usage: python generate_learning_material.py --dossier path.json --output out.pdf
Stdout: JSON { "success": true, "pdf_path": "...", "page_count": N }
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

from learning_validate import CRITERIA_CHAPTERS, validate_learning_content  # noqa: E402

MODEL = os.environ.get("LEARNING_MODEL", "gpt-4.1")
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


def aggregate_errors_by_criteria(dossier: Dict[str, Any]) -> Dict[str, List[Dict]]:
    by_crit: Dict[str, List[Dict]] = defaultdict(list)
    for exam in dossier.get("exams", []):
        for err in exam.get("errors", []):
            crit = err.get("criteria") or "Other"
            by_crit[crit].append({
                "exam_index": exam.get("exam_index"),
                "title": err.get("title"),
                "severity": err.get("severity"),
                "sub_category": err.get("sub_category"),
                "explanation": err.get("explanation"),
                "original_text": err.get("original_text"),
                "correction_text": err.get("correction_text"),
            })
    return by_crit


def collect_grammar_enrichments(dossier: Dict[str, Any], limit: int = 3) -> List[Dict]:
    seen = set()
    out: List[Dict] = []
    for exam in dossier.get("exams", []):
        ga = exam.get("grammar_analysis") or {}
        for sug in ga.get("enrichment_suggestions") or []:
            text = sug if isinstance(sug, str) else (
                sug.get("lesson") or sug.get("text") or sug.get("suggestion") or ""
            )
            key = text.strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append({"exam_index": exam.get("exam_index"), "text": text})
            if len(out) >= limit:
                return out
    return out


def build_llm_payload(dossier: Dict[str, Any]) -> str:
    """Compact dossier summary for the LLM prompt."""
    errors_by = aggregate_errors_by_criteria(dossier)
    enrichments = collect_grammar_enrichments(dossier, 5)

    summary = {
        "candidate_name": dossier.get("candidate_name"),
        "target_band": dossier.get("target_band"),
        "edition_number": dossier.get("edition_number"),
        "exam_range": dossier.get("exam_range"),
        "preview": dossier.get("preview"),
        "errors_by_criteria": {k: v[:12] for k, v in errors_by.items()},
        "grammar_enrichments_available": enrichments,
        "exam_bands": [
            {
                "exam_index": e.get("exam_index"),
                "task": f"{e.get('exam_type')} {e.get('task_type')}",
                "overall": e.get("overall_band"),
                "response": e.get("response_band"),
                "coherence": e.get("coherence_band"),
                "vocabulary": e.get("vocabulary_band"),
                "grammar": e.get("grammar_band"),
                "strengths": (e.get("strengths") or [])[:3],
                "weaknesses": (e.get("weaknesses") or [])[:3],
                "high_impact_fixes": (e.get("high_impact_fixes") or [])[:3],
            }
            for e in dossier.get("exams", [])
        ],
    }
    return json.dumps(summary, ensure_ascii=False)


def template_fallback(dossier: Dict[str, Any], errors_by: Dict[str, List]) -> Dict[str, Any]:
    templates = load_templates()
    chapters = []

    crit_map = {
        "Task Response": ["Task Response"],
        "Coherence and Cohesion": ["Coherence and Cohesion", "Coherence"],
        "Lexical Resource": ["Lexical Resource"],
        "Grammatical Range and Accuracy": ["Grammatical Range and Accuracy", "Grammar"],
    }

    for chapter_crit in CRITERIA_CHAPTERS:
        keys = crit_map.get(chapter_crit, [chapter_crit])
        sections = []
        for key in keys:
            for err in errors_by.get(key, [])[:5]:
                slug = slugify(err.get("title") or "")
                tpl = templates.get(slug) or templates.get(slug.replace("repetition_of_", "repetition_"))
                body = tpl["body"] if tpl else (
                    f"Recurring issue: {err.get('title')}. "
                    f"{err.get('explanation') or 'Focus on this pattern in your next practice essays.'}"
                )
                sections.append({
                    "heading": err.get("title") or "Focus area",
                    "body": body,
                    "source_refs": [{"exam_index": err.get("exam_index"), "error_title": err.get("title")}],
                })

        if not sections:
            sections.append({
                "heading": "Continue building strength",
                "body": "No major recurring issues in this criterion for this edition. Maintain your current approach and aim for consistency across task types.",
                "source_refs": [],
            })

        chapters.append({"criteria": chapter_crit, "sections": sections, "micro_lessons": []})

    enrichments = collect_grammar_enrichments(dossier, 3)
    grammar_ch = next(c for c in chapters if c["criteria"] == "Grammatical Range and Accuracy")
    for enr in enrichments:
        grammar_ch["micro_lessons"].append({
            "title": "Grammar micro-lesson",
            "body": enr["text"],
            "source_enrichment": enr["text"],
        })

    return {
        "overview": {
            "title": f"Personalized Learning — Edition {dossier.get('edition_number')}",
            "edition_number": dossier.get("edition_number"),
            "candidate_name": dossier.get("candidate_name"),
            "exam_range": dossier.get("exam_range"),
            "summary": (
                f"This guide synthesizes patterns from exams {dossier['exam_range']['start']}–"
                f"{dossier['exam_range']['end']} to help you reach band {dossier.get('target_band') or 'your target'}."
            ),
        },
        "chapters": chapters,
    }


async def call_llm(dossier: Dict[str, Any]) -> Dict[str, Any]:
    import openai

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    client = openai.AsyncOpenAI(api_key=api_key)
    payload = build_llm_payload(dossier)

    system = """You are an expert IELTS Writing tutor creating a personalized study guide.
Output ONLY valid JSON matching this schema:
{
  "overview": {
    "title": string,
    "edition_number": number,
    "candidate_name": string,
    "exam_range": {"start": number, "end": number},
    "summary": string (2-3 sentences, grounded in provided data only)
  },
  "chapters": [
    {
      "criteria": one of "Task Response" | "Coherence and Cohesion" | "Lexical Resource" | "Grammatical Range and Accuracy",
      "sections": [
        {
          "heading": string,
          "body": string (2-4 paragraphs, practical, no invented exam details),
          "source_refs": [{"exam_index": number, "error_title": string}]
        }
      ],
      "micro_lessons": [] 
    }
  ]
}
Rules:
- Exactly 4 chapters in criteria order.
- Every section must cite real errors via source_refs from the input data.
- Do NOT invent errors, bands, or essay content not in the input.
- Grammar chapter: add up to 3 micro_lessons from grammar_enrichments_available only.
- Tone: academic, encouraging, specific."""

    user = f"Create the learning guide JSON from this dossier summary:\n\n{payload}"

    response = await client.chat.completions.create(
        model=MODEL,
        temperature=TEMPERATURE,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


def render_pdf(content: Dict[str, Any], dossier: Dict[str, Any], output_path: str) -> int:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BookTitle",
        parent=styles["Title"],
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=20,
        textColor=colors.HexColor("#1a365d"),
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        spaceBefore=18,
        spaceAfter=10,
        textColor=colors.HexColor("#2c5282"),
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor("#2d3748"),
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontSize=10.5,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    )
    meta = ParagraphStyle(
        "Meta",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )

    story = []
    overview = content.get("overview") or {}

    story.append(Spacer(1, 2 * cm))
    story.append(Paragraph(overview.get("title") or "Personalized Learning Guide", title_style))
    story.append(Paragraph(
        f"Prepared for {overview.get('candidate_name', 'Candidate')} · "
        f"Exams {overview.get('exam_range', {}).get('start')}–{overview.get('exam_range', {}).get('end')}",
        meta,
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(overview.get("summary") or "", body))

    preview = dossier.get("preview") or {}
    bands = preview.get("avgBands") or {}
    if bands:
        band_line = " · ".join(
            f"{k.capitalize()}: {v:.1f}"
            for k, v in bands.items()
            if v is not None and k != "overall"
        )
        if bands.get("overall") is not None:
            band_line = f"Overall avg: {bands['overall']:.1f}" + (f" · {band_line}" if band_line else "")
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(band_line, meta))

    story.append(PageBreak())

    for ch in content.get("chapters") or []:
        crit = ch.get("criteria") or "Chapter"
        story.append(Paragraph(crit, h1))

        for sec in ch.get("sections") or []:
            story.append(Paragraph(sec.get("heading") or "Section", h2))
            text = (sec.get("body") or "").replace("\n", "<br/>")
            story.append(Paragraph(text, body))

        for lesson in ch.get("micro_lessons") or []:
            story.append(Paragraph(lesson.get("title") or "Micro-lesson", h2))
            text = (lesson.get("body") or "").replace("\n", "<br/>")
            story.append(Paragraph(text, body))

        story.append(PageBreak())

    story.append(Paragraph("Practice Plan", h1))
    story.append(Paragraph(
        "1. Re-read your flagged errors from exams "
        f"{overview.get('exam_range', {}).get('start')}–{overview.get('exam_range', {}).get('end')}.<br/>"
        "2. Write one paragraph targeting your weakest criterion without time pressure.<br/>"
        "3. Submit your next practice essay and compare error frequency in the following edition.",
        body,
    ))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(
        f"Generated {datetime.utcnow().strftime('%Y-%m-%d')} · IELTS Grader Personalized Learning",
        meta,
    ))

    doc.build(story)
    # Rough page estimate from story length
    return max(12, min(20, 4 + sum(len(ch.get("sections") or []) for ch in content.get("chapters") or [])))


async def main_async(dossier_path: str, output_path: str) -> Dict[str, Any]:
    dossier = load_dossier(dossier_path)
    errors_by = aggregate_errors_by_criteria(dossier)

    content: Optional[Dict[str, Any]] = None
    used_fallback = False

    try:
        content = await call_llm(dossier)
        ok, issues = validate_learning_content(content, dossier)
        if not ok:
            print(f"[generate_learning_material] Validation failed: {issues}", file=sys.stderr)
            content = template_fallback(dossier, errors_by)
            used_fallback = True
    except Exception as exc:
        print(f"[generate_learning_material] LLM failed, using templates: {exc}", file=sys.stderr)
        content = template_fallback(dossier, errors_by)
        used_fallback = True

    page_count = render_pdf(content, dossier, output_path)
    return {
        "success": True,
        "pdf_path": output_path,
        "page_count": page_count,
        "used_fallback": used_fallback,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dossier", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    result = asyncio.run(main_async(args.dossier, args.output))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
