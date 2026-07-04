"""
Post-processing for grader error lists (no prompt changes).

- Dedupe pattern-across-text error IDs (one card max).
- Drop poor_overall_structure false positives caused by missing newlines
  (upload text-box / OCR artifacts).
"""

from __future__ import annotations

import re
from typing import Dict, List

# One entry max per submission — these describe essay-wide patterns, not
# per-occurrence issues.
PATTERN_ERROR_IDS = frozenset({
    "overuse_linkers",
    "underuse_linkers",
    "repetition_basic_lexis",
    "limited_vocabulary_range",
    "limited_grammatical_range",
    "limited_sentence_variety",
    "insufficient_letter_vocabulary",
})

_SEVERITY_RANK = {"major": 0, "high": 1, "medium": 2, "low": 3}

_PARAGRAPH_ARTIFACT_RE = re.compile(
    r"continuous block|double spaces?|one (long )?block|"
    r"without (clear )?paragraph|no paragraph|missing paragraph|"
    r"paragraph breaks?|visible separation|rather than clear paragraph",
    re.IGNORECASE,
)


def _severity_rank(error: dict) -> int:
    sev = (error.get("severity") or "medium").lower()
    return _SEVERITY_RANK.get(sev, 2)


def dedupe_pattern_errors(errors: List[dict]) -> List[dict]:
    """Keep a single highest-severity instance of each pattern-level error_id."""
    if not errors:
        return errors

    best: Dict[str, dict] = {}
    best_idx: Dict[str, int] = {}
    out: List[dict] = []

    for i, err in enumerate(errors):
        eid = err.get("error_id") or ""
        if eid not in PATTERN_ERROR_IDS:
            out.append(err)
            continue
        prev = best.get(eid)
        if prev is None or _severity_rank(err) < _severity_rank(prev):
            best[eid] = err
            best_idx[eid] = i

    # Re-insert pattern winners in original order (first occurrence position
    # of the chosen instance).
    winners = sorted(best_idx.items(), key=lambda kv: kv[1])
    # Merge into out preserving relative order: walk original list, emit
    # non-pattern as-is, emit pattern only when we hit the chosen index.
    chosen_positions = set(best_idx.values())
    result: List[dict] = []
    for i, err in enumerate(errors):
        eid = err.get("error_id") or ""
        if eid in PATTERN_ERROR_IDS:
            if i in chosen_positions:
                result.append(best[eid])
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
