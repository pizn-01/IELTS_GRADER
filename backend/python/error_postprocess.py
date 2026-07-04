"""
Post-processing for grader error lists (no prompt changes).

- Dedupe pattern-across-text error IDs (one card max).
- Drop poor_overall_structure false positives caused by missing newlines
  (upload text-box / OCR artifacts).
"""

from __future__ import annotations

import re
from typing import Dict, List

# Pattern-across-text IDs: one card per (error_id, severity), not one per
# occurrence. Different severities stay separate; same severity collapses.
PATTERN_ERROR_IDS = frozenset({
    "overuse_linkers",
    "underuse_linkers",
    "repetition_basic_lexis",
    "limited_vocabulary_range",
    "limited_grammatical_range",
    "limited_sentence_variety",
    "insufficient_letter_vocabulary",
})

_PARAGRAPH_ARTIFACT_RE = re.compile(
    r"continuous block|double spaces?|one (long )?block|"
    r"without (clear )?paragraph|no paragraph|missing paragraph|"
    r"paragraph breaks?|visible separation|rather than clear paragraph",
    re.IGNORECASE,
)


def _norm_severity(error: dict) -> str:
    sev = (error.get("severity") or "medium").lower().strip()
    if sev not in ("major", "high", "medium", "low"):
        return "medium"
    return sev


def dedupe_pattern_errors(errors: List[dict]) -> List[dict]:
    """
    Collapse pattern-level errors by (error_id, severity).

    Five medium overuse_linkers → one medium card (examples merged).
    A high and a medium overuse_linkers → two cards, one per severity.
    """
    if not errors:
        return errors

    # key -> (first_index, kept_error, list of original_text snippets)
    groups: Dict[tuple, tuple] = {}

    for i, err in enumerate(errors):
        eid = err.get("error_id") or ""
        if eid not in PATTERN_ERROR_IDS:
            continue
        key = (eid, _norm_severity(err))
        snippet = (err.get("original_text") or "").strip()
        if key not in groups:
            groups[key] = (i, dict(err), [snippet] if snippet else [])
        else:
            idx, kept, snippets = groups[key]
            if snippet and snippet not in snippets:
                snippets.append(snippet)
            groups[key] = (idx, kept, snippets)

    # Attach merged examples to each kept card
    for key, (idx, kept, snippets) in list(groups.items()):
        unique = [s for s in snippets if s]
        if len(unique) > 1:
            examples = "; ".join(f'"{s}"' for s in unique[:8])
            expl = (kept.get("explanation") or "").rstrip()
            suffix = f" Examples across the text: {examples}."
            if suffix.strip() not in expl:
                kept["explanation"] = (expl + suffix).strip()
            # Keep first quote as original_text; note multiplicity in context
            if unique:
                kept["original_text"] = unique[0]
                kept["context"] = (
                    (kept.get("context") or "")
                    + (f" Also: {', '.join(unique[1:6])}." if len(unique) > 1 else "")
                ).strip()
        groups[key] = (idx, kept, snippets)

    chosen_positions = {idx: kept for idx, kept, _ in groups.values()}
    # Map position -> kept error (may be enriched)
    pos_to_kept = {idx: kept for (idx, kept, _) in groups.values()}

    result: List[dict] = []
    for i, err in enumerate(errors):
        eid = err.get("error_id") or ""
        if eid in PATTERN_ERROR_IDS:
            if i in pos_to_kept:
                result.append(pos_to_kept[i])
        else:
            result.append(err)
    return result


def has_paragraph_breaks(text: str) -> bool:
    if not text:
        return False
    if "\n\n" in text:
        return True
    # Multiple single newlines also count as structure
    return text.count("\n") >= 2


def is_poor_overall_structure_paragraph_artifact(error: dict, user_answer: str) -> bool:
    """
    True when poor_overall_structure is only complaining about missing
    paragraph breaks and the essay text has no newlines (input artifact).
    """
    if error.get("error_id") != "poor_overall_structure":
        return False
    if has_paragraph_breaks(user_answer or ""):
        return False
    explanation = f"{error.get('explanation', '')} {error.get('context', '')}"
    return bool(_PARAGRAPH_ARTIFACT_RE.search(explanation))


def normalize_paragraph_breaks(text: str) -> str:
    """
    If text has no paragraph breaks but uses sentence-ending + double spaces
    (common OCR / single-line paste artifact), convert those to \\n\\n.
    Leave text that already has newlines unchanged.
    """
    if not text or not text.strip():
        return text
    if has_paragraph_breaks(text):
        return text
    # Period/question/exclamation + two or more spaces → paragraph break
    normalized = re.sub(r"([.!?])[ \t]{2,}", r"\1\n\n", text)
    return normalized
