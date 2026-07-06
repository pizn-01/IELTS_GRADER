"""
Validate LLM learning material JSON against dossier source_refs.
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

CRIT_ALIASES = {
    "Task Response": ["Task Response"],
    "Coherence and Cohesion": ["Coherence and Cohesion", "Coherence"],
    "Lexical Resource": ["Lexical Resource", "Lexical"],
    "Grammatical Range and Accuracy": ["Grammatical Range and Accuracy", "Grammar"],
}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def build_source_index(dossier: Dict[str, Any]) -> Dict[str, Any]:
    errors_by_key: Dict[str, Dict] = {}
    error_titles: Set[str] = set()
    enrichment_originals: Set[str] = set()
    unused_enrichment_originals: Set[str] = set()

    agg = dossier.get("aggregated") or {}
    for err in agg.get("recurring_errors") or []:
        title = err.get("title") or ""
        error_titles.add(_norm(title))

    for exam in dossier.get("exams", []):
        exam_idx = exam.get("exam_index")
        for err in exam.get("errors", []):
            title = err.get("title") or ""
            error_titles.add(_norm(title))
            key = f"exam:{exam_idx}:error:{err.get('id') or title}"
            errors_by_key[key] = err

        ga = exam.get("grammar_analysis") or {}
        for sug in ga.get("enrichment_suggestions") or []:
            if isinstance(sug, str):
                enrichment_originals.add(_norm(sug))
            elif isinstance(sug, dict):
                orig = sug.get("original") or sug.get("structure") or sug.get("lesson") or ""
                enrichment_originals.add(_norm(orig))

    for enr in (agg.get("grammar") or {}).get("unused_enrichments") or []:
        unused_enrichment_originals.add(_norm(enr.get("original") or ""))

    return {
        "errors_by_key": errors_by_key,
        "error_titles": error_titles,
        "enrichment_originals": enrichment_originals,
        "unused_enrichment_originals": unused_enrichment_originals,
    }


def validate_chapter(chapter: Dict[str, Any], dossier: Dict[str, Any], expected_crit: str) -> Tuple[bool, List[str]]:
    issues: List[str] = []
    index = build_source_index(dossier)

    if chapter.get("criteria") != expected_crit:
        issues.append(f"Chapter criteria mismatch: {chapter.get('criteria')}")

    sections = chapter.get("sections") or []
    if len(sections) < 1:
        issues.append("Chapter needs at least one section")

    for section in sections:
        refs = section.get("source_refs") or []
        body = section.get("body") or ""
        if not body or len(body) < 80:
            issues.append(f"Section too short: {section.get('heading')}")
        for ref in refs:
            if not _ref_valid(ref, index, dossier):
                issues.append(f"Invalid source_ref: {ref}")

    if expected_crit == "Grammatical Range and Accuracy":
        for lesson in chapter.get("micro_lessons") or []:
            src = lesson.get("source_enrichment") or lesson.get("title") or ""
            if src and _norm(src) not in index["unused_enrichment_originals"]:
                if not any(_norm(src) in u or u in _norm(src) for u in index["unused_enrichment_originals"] if u):
                    issues.append(f"Micro-lesson not from unused enrichments: {src[:60]}")

    return len(issues) == 0, issues


def validate_learning_content(content: Dict[str, Any], dossier: Dict[str, Any]) -> Tuple[bool, List[str]]:
    issues: List[str] = []
    chapters = content.get("chapters") or []
    if len(chapters) < 4:
        issues.append("Expected 4 chapters")

    seen = set()
    for ch in chapters:
        crit = ch.get("criteria")
        if crit:
            seen.add(crit)
            ok, ch_issues = validate_chapter(ch, dossier, crit)
            if not ok:
                issues.extend(ch_issues)

    for required in CRITERIA_CHAPTERS:
        if required not in seen:
            issues.append(f"Missing chapter: {required}")

    return len(issues) == 0, issues


def _ref_valid(ref: Any, index: Dict, dossier: Dict) -> bool:
    if isinstance(ref, dict):
        title = _norm(ref.get("error_title") or ref.get("title") or "")
        if title and title in index["error_titles"]:
            return True
        exam_idx = ref.get("exam_index")
        if exam_idx is not None and title:
            for exam in dossier.get("exams", []):
                if exam.get("exam_index") == exam_idx:
                    for err in exam.get("errors", []):
                        if _norm(err.get("title")) == title:
                            return True
        return False

    if isinstance(ref, str):
        return _norm(ref) in index["error_titles"] or ref in index["errors_by_key"]

    return False
