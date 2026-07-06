"""
ReportLab theme helpers for Personalized Learning PDFs.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# Brand tokens matching the app
BRAND_BLUE = colors.HexColor("#1A96F3")
BRAND_DARK = colors.HexColor("#2C3E50")
BRAND_BG = colors.HexColor("#F4F6F8")
RED_TINT = colors.HexColor("#FEF2F2")
RED_BORDER = colors.HexColor("#FCA5A5")
RED_TEXT = colors.HexColor("#B91C1C")
GREEN_TINT = colors.HexColor("#F0FDF4")
GREEN_BORDER = colors.HexColor("#86EFAC")
GREEN_TEXT = colors.HexColor("#166534")
PANEL_BG = colors.HexColor("#F8FAFC")
MUTED = colors.HexColor("#64748B")

CRITERION_SHORT = {
    "Task Response": "TR",
    "Coherence and Cohesion": "CC",
    "Lexical Resource": "LR",
    "Grammatical Range and Accuracy": "GRA",
}

CRITERION_ACCENT = {
    "Task Response": colors.HexColor("#2563EB"),
    "Coherence and Cohesion": colors.HexColor("#7C3AED"),
    "Lexical Resource": colors.HexColor("#059669"),
    "Grammatical Range and Accuracy": colors.HexColor("#DC2626"),
}


def build_styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "BookTitle",
            parent=base["Title"],
            fontSize=22,
            leading=28,
            alignment=TA_CENTER,
            spaceAfter=10,
            textColor=BRAND_DARK,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            textColor=MUTED,
        ),
        "kpi": ParagraphStyle(
            "KPI",
            parent=base["Normal"],
            fontSize=10,
            leading=13,
            alignment=TA_CENTER,
            textColor=BRAND_DARK,
            fontName="Helvetica-Bold",
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontSize=16,
            leading=20,
            spaceBefore=6,
            spaceAfter=8,
            textColor=BRAND_DARK,
            fontName="Helvetica-Bold",
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontSize=12,
            leading=15,
            spaceBefore=10,
            spaceAfter=5,
            textColor=BRAND_DARK,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontSize=10.5,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
            textColor=BRAND_DARK,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontSize=9,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "badge": ParagraphStyle(
            "Badge",
            parent=base["Normal"],
            fontSize=8.5,
            textColor=MUTED,
            fontName="Helvetica-Bold",
        ),
        "callout_label": ParagraphStyle(
            "CalloutLabel",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            fontName="Helvetica-Bold",
            textColor=RED_TEXT,
        ),
        "callout_fix_label": ParagraphStyle(
            "CalloutFixLabel",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            fontName="Helvetica-Bold",
            textColor=GREEN_TEXT,
        ),
        "callout_text": ParagraphStyle(
            "CalloutText",
            parent=base["Normal"],
            fontSize=9.5,
            leading=13,
            textColor=BRAND_DARK,
        ),
        "lesson_panel": ParagraphStyle(
            "LessonPanel",
            parent=base["Normal"],
            fontSize=10,
            leading=14,
            textColor=BRAND_DARK,
            backColor=PANEL_BG,
            borderPadding=8,
        ),
    }


class GradientBand(Flowable):
    """Simple header band for cover page."""

    def __init__(self, width: float, height: float, color: colors.Color = BRAND_BLUE):
        super().__init__()
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)


def make_page_callbacks(overview: Dict[str, Any]) -> Tuple[Any, Any]:
    edition = overview.get("edition_number", "")

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(1.8 * cm, A4[1] - 1.2 * cm, f"IELTS Grader · Edition {edition}")
        canvas.drawRightString(A4[0] - 1.8 * cm, 1.2 * cm, f"Page {doc.page}")
        canvas.restoreState()

    def on_first_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, A4[1] - 3.2 * cm, A4[0], 3.2 * cm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(1.8 * cm, A4[1] - 1.4 * cm, "IELTS GRADER")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(A4[0] - 1.8 * cm, 1.2 * cm, f"Page {doc.page}")
        canvas.restoreState()

    return on_first_page, on_page


def build_cover_story(
    overview: Dict[str, Any],
    dossier: Dict[str, Any],
    styles: Dict[str, ParagraphStyle],
) -> List[Any]:
    story: List[Any] = []
    story.append(Spacer(1, 2.8 * cm))
    story.append(Paragraph(overview.get("title") or "Personalized Learning Guide", styles["title"]))

    exam_range = overview.get("exam_range") or dossier.get("exam_range") or {}
    story.append(Paragraph(
        f"{overview.get('candidate_name', 'Candidate')} · Exams {exam_range.get('start', '')}–{exam_range.get('end', '')}",
        styles["subtitle"],
    ))
    story.append(Spacer(1, 0.6 * cm))

    preview = dossier.get("preview") or {}
    bands = preview.get("avgBands") or {}
    if bands.get("overall") is not None:
        kpi_cells = []
        for key, label in [
            ("overall", "Overall"),
            ("response", "TR"),
            ("coherence", "CC"),
            ("vocabulary", "LR"),
            ("grammar", "GRA"),
        ]:
            val = bands.get(key)
            if val is not None:
                kpi_cells.append(Paragraph(f"<b>{label}</b><br/>{val:.1f}", styles["kpi"]))

        if kpi_cells:
            kpi_table = Table([kpi_cells], colWidths=[3.2 * cm] * len(kpi_cells))
            kpi_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]))
            story.append(kpi_table)
            story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph((overview.get("summary") or "").replace("\n", "<br/>"), styles["body"]))
    story.append(Spacer(1, 0.3 * cm))

    for focus in overview.get("priority_focus") or []:
        story.append(Paragraph(f"• {focus}", styles["body"]))

    agg = dossier.get("aggregated") or {}
    tasks = agg.get("tasks_in_edition") or []
    if tasks:
        labels = ", ".join(t.get("label", "") for t in tasks if t.get("label"))
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(f"<b>Task types covered:</b> {labels}", styles["body"]))

    story.append(PageBreak())
    return story


def chapter_opener(criteria: str, styles: Dict[str, ParagraphStyle]) -> List[Any]:
    short = CRITERION_SHORT.get(criteria, criteria[:3].upper())
    accent = CRITERION_ACCENT.get(criteria, BRAND_BLUE)
    badge = Paragraph(
        f'<font color="{accent.hexval()}"><b>{short}</b></font> · {criteria}',
        styles["h1"],
    )
    opener_table = Table([[badge]], colWidths=[16.5 * cm])
    opener_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_BG),
    ]))
    return [opener_table, Spacer(1, 0.3 * cm)]


def section_heading(heading: str, error_count: Optional[int], task_label: Optional[str], styles: Dict) -> Paragraph:
    parts = [heading]
    if error_count and error_count >= 2:
        parts.append(f'<font color="{MUTED.hexval()}"> ×{error_count} across exams</font>')
    if task_label:
        parts.append(f'<font color="{MUTED.hexval()}"> · {task_label}</font>')
    return Paragraph("".join(parts), styles["h2"])


def student_callout_table(original: str, correction: str, styles: Dict) -> Table:
    orig_para = Paragraph(original.replace("\n", " "), styles["callout_text"])
    fix_para = Paragraph(correction.replace("\n", " "), styles["callout_text"]) if correction else Paragraph("", styles["callout_text"])

    data = [
        [Paragraph("Your writing", styles["callout_label"]), Paragraph("Better version", styles["callout_fix_label"])],
        [orig_para, fix_para],
    ]
    table = Table(data, colWidths=[8 * cm, 8 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), RED_TINT),
        ("BACKGROUND", (1, 0), (1, 0), GREEN_TINT),
        ("BACKGROUND", (0, 1), (0, 1), RED_TINT),
        ("BACKGROUND", (1, 1), (1, 1), GREEN_TINT),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def micro_lesson_panel(lesson: Dict[str, Any], styles: Dict) -> List[Any]:
    story: List[Any] = []
    story.append(Paragraph(lesson.get("title") or "Micro-lesson", styles["h2"]))

    rows = []
    if lesson.get("rule"):
        rows.append([Paragraph(f"<b>Rule:</b> {lesson['rule']}", styles["lesson_panel"])])

    bullets = []
    for item in lesson.get("when_to_use") or []:
        bullets.append(f"• {item}")
    for mistake in lesson.get("your_mistakes") or []:
        bullets.append(
            f"• Exam {mistake.get('exam_index')}: {mistake.get('original', '')} → {mistake.get('fix', '')}"
        )
    for ex in lesson.get("example_sentences") or []:
        if ex:
            bullets.append(f"• Example: {ex}")
    for ex in lesson.get("mini_exercises") or []:
        bullets.append(f"• Practice: {ex}")

    if bullets:
        rows.append([Paragraph("<br/>".join(bullets), styles["lesson_panel"])])

    if rows:
        panel = Table(rows, colWidths=[16.5 * cm])
        panel.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PANEL_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(panel)
        story.append(Spacer(1, 0.3 * cm))

    return story


def build_body_story(content: Dict[str, Any], dossier: Dict[str, Any], styles: Dict) -> List[Any]:
    story: List[Any] = []

    for ch in content.get("chapters") or []:
        criteria = ch.get("criteria") or "Chapter"
        story.extend(chapter_opener(criteria, styles))

        for sec in ch.get("sections") or []:
            story.append(section_heading(
                sec.get("heading") or "Section",
                sec.get("error_count"),
                sec.get("task_label"),
                styles,
            ))
            story.append(Paragraph((sec.get("body") or "").replace("\n", "<br/>"), styles["body"]))

            for ex in sec.get("student_examples") or []:
                if ex.get("original") or ex.get("correction"):
                    story.append(Spacer(1, 0.15 * cm))
                    story.append(student_callout_table(
                        ex.get("original") or "",
                        ex.get("correction") or "",
                        styles,
                    ))
                    story.append(Spacer(1, 0.2 * cm))

        for lesson in ch.get("micro_lessons") or []:
            story.extend(micro_lesson_panel(lesson, styles))

        story.append(PageBreak())

    story.append(Paragraph("Practice Plan", styles["h1"]))
    plan = content.get("practice_plan") or {}
    for i, step in enumerate(plan.get("steps") or [], 1):
        story.append(Paragraph(f"{i}. {step}", styles["body"]))

    overview = content.get("overview") or {}
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph(
        f"Generated {datetime.utcnow().strftime('%Y-%m-%d')} · IELTS Grader · Edition {overview.get('edition_number', '')}",
        styles["meta"],
    ))
    return story
