"""
Validate LLM learning material JSON against dossier source_refs.
Every cited error must exist in the dossier; enrichment lessons must map to grammar_analysis.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Set, Tuple


CRITERIA_CHAPTERS = [
    "Task Response",
    "Coherence and Cohesion",
    "Lexical Resource",
    "Grammatical Range and Accuracy",
]


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def build_source_index(dossier: Dict[str, Any]) -> Dict[str, Any]:
    """Index errors and grammar enrichments for validation."""
    errors_by_key: Dict[str, Dict] = {}
    error_titles: Set[str] = set()
    enrichment_texts: Set[str] = set()

    for exam in dossier.get("exams", []):
        exam_idx = exam.get("exam_index")
        for err in exam.get("errors", []):
            title = err.get("title") or ""
            error_titles.add(_norm(title))
            key = f"exam:{exam_idx}:error:{err.get('id') or title}"
            errors_by_key[key] = err
            errors_by_key[f"exam:{exam_idx}:{_norm(title)}"] = err

        ga = exam.get("grammar_analysis") or {}
        for sug in ga.get("enrichment_suggestions") or []:
            if isinstance(sug, str):
                enrichment_texts.add(_norm(sug))
            elif isinstance(sug, dict):
                text = sug.get("lesson") or sug.get("text") or sug.get("suggestion") or ""
                enrichment_texts.add(_norm(text))

    return {
        "errors_by_key": errors_by_key,
        "error_titles": error_titles,
        "enrichment_texts": enrichment_texts,
    }


def validate_learning_content(
    content: Dict[str, Any],
    dossier: Dict[str, Any],
) -> Tuple[bool, List[str]]:
    issues: List[str] = []
    index = build_source_index(dossier)

    if not isinstance(content, dict):
        return False, ["Content must be a JSON object"]

    chapters = content.get("chapters")
    if not isinstance(chapters, list) or len(chapters) < 4:
        issues.append("Expected at least 4 chapters")

    seen_criteria = set()
    for ch in chapters or []:
        crit = ch.get("criteria")
        if crit:
            seen_criteria.add(crit)
        for section in ch.get("sections", []):
            refs = section.get("source_refs") or []
            for ref in refs:
                if not _ref_valid(ref, index, dossier):
                    issues.append(f"Invalid source_ref: {ref}")

        for lesson in ch.get("micro_lessons", []) or []:
            src = lesson.get("source_enrichment") or lesson.get("source_ref") or ""
            if src and _norm(src) not in index["enrichment_texts"]:
                # Allow partial match
                if not any(_norm(src) in e or e in _norm(src) for e in index["enrichment_texts"] if e):
                    issues.append(f"Micro-lesson not grounded in enrichment_suggestions: {src[:80]}")

    for required in CRITERIA_CHAPTERS:
        if required not in seen_criteria:
            issues.append(f"Missing chapter: {required}")

    overview = content.get("overview") or {}
    if overview.get("edition_number") != dossier.get("edition_number"):
        issues.append("Edition number mismatch in overview")

    return len(issues) == 0, issues


def _ref_valid(ref: Any, index: Dict, dossier: Dict) -> bool:
    if isinstance(ref, dict):
        exam_idx = ref.get("exam_index")
        title = _norm(ref.get("error_title") or ref.get("title") or "")
        if title and title in index["error_titles"]:
            return True
        if exam_idx is not None:
            for exam in dossier.get("exams", []):
                if exam.get("exam_index") == exam_idx:
                    for err in exam.get("errors", []):
                        if _norm(err.get("title")) == title:
                            return True
        return False

    if isinstance(ref, str):
        key = ref.strip()
        if key in index["errors_by_key"]:
            return True
        return _norm(key) in index["error_titles"]

    return False
