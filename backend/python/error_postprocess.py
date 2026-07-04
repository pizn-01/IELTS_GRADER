"""
Shared post-processing for grader error lists (no prompt changes).

All three graders (Task 2, Task 1 report, Task 1 letter) call
``postprocess_detected_errors`` after each criterion's error-detection pass.
Filters that do not match an error_id are no-ops, so the full pipeline is
safe to run everywhere without changing behaviour for task-specific tags.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Pattern-across-text IDs: one card per (error_id, severity)
# ---------------------------------------------------------------------------
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

# Data-accuracy self-contradiction (Task 1 report primarily)
_WITHIN_TOLERANCE_RE = re.compile(
    r"within (the )?(±?\s*15\s*%|tolerance)"
    r"|acceptable round"
    r"|is acceptable"
    r"|not\s+(be\s+)?(treated|flagged|considered)\s+as\s+(a\s+)?(data\s+)?error"
    r"|should not be (treated|flagged|considered)",
    re.IGNORECASE,
)

_UNVERIFIABLE_REFERENCE_RE = re.compile(
    r"unreadable|garbled|illegible"
    r"|cannot be (extracted|verified|confirmed|determined)"
    r"|can(no|')t be (extracted|verified|confirmed|determined)"
    r"|(not|isn'?t|is not) verifiable"
    r"|unable to (verify|confirm|extract|determine)"
    r"|no(t)? (readable|available|reliable) reference"
    r"|reference data (is|was) (unclear|unavailable|missing|incomplete)",
    re.IGNORECASE,
)

_IMPRECISION_ONLY_RE = re.compile(
    r"\bimprecise\b"
    r"|\bwording implies\b"
    r"|\bmore precise\b"
    r"|\bnot (the )?exact\b"
    r"|\bcloser to\b.{0,40}\bthan\b"
    r"|\bclearly plotted\b",
    re.IGNORECASE,
)

# Bracketed non-answer in corrected_text (any error type)
_PLACEHOLDER_CORRECTION_RE = re.compile(
    r"\[[^\]]*(not readable|unreadable|not visible|illegible|unclear|unknown|"
    r"not available|unavailable|cannot be (read|determined|verified)|"
    r"can'?t be (read|determined|verified))[^\]]*\]",
    re.IGNORECASE,
)

# Support cues after a claim for ideas_underdeveloped FP detection
_SUPPORT_CUE_RE = re.compile(
    r"\b("
    r"because|since|as a result|due to|owing to|"
    r"for example|for instance|such as|e\.g\.|"
    r"this (is|means|shows|leads|results)|"
    r"specifically|namely|in other words"
    r")\b"
    r"|\d+(?:\.\d+)?%?",
    re.IGNORECASE,
)


@dataclass
class PostprocessStats:
    """Counts of errors removed/merged by each shared safety net."""

    data_accuracy_dropped: int = 0
    placeholder_correction_dropped: int = 0
    ideas_underdeveloped_dropped: int = 0
    poor_overall_structure_dropped: int = 0
    pattern_deduped: int = 0

    @property
    def total_removed(self) -> int:
        return (
            self.data_accuracy_dropped
            + self.placeholder_correction_dropped
            + self.ideas_underdeveloped_dropped
            + self.poor_overall_structure_dropped
            + self.pattern_deduped
        )


def _norm_severity(error: dict) -> str:
    sev = (error.get("severity") or "medium").lower().strip()
    if sev not in ("major", "high", "medium", "low"):
        return "medium"
    return sev


# ---------------------------------------------------------------------------
# Individual filters (same logic as previously inlined in graders)
# ---------------------------------------------------------------------------

def is_self_contradicting_data_accuracy_error(error: dict) -> bool:
    """Drop data_accuracy_error whose own explanation admits within-tolerance / unreadable reference."""
    if error.get("error_id") != "data_accuracy_error":
        return False
    explanation = f"{error.get('explanation', '')} {error.get('context', '')}"
    if _WITHIN_TOLERANCE_RE.search(explanation) or _UNVERIFIABLE_REFERENCE_RE.search(explanation):
        return True
    if _IMPRECISION_ONLY_RE.search(explanation) and not re.search(
        r"(more than|exceeds?|over)\s+(the\s+)?15\s*%", explanation, re.IGNORECASE
    ):
        return True
    return False


def has_unusable_placeholder_correction(error: dict) -> bool:
    """Drop any error whose corrected_text is a bracketed give-up placeholder."""
    corrected = error.get("corrected_text", "") or ""
    return bool(_PLACEHOLDER_CORRECTION_RE.search(corrected))


def paragraph_containing(text: str, quote: str) -> Optional[str]:
    """Return the paragraph that contains quote, or None if not found."""
    if not text or not quote:
        return None
    paragraphs = re.split(r"\n\s*\n", text.strip())
    if len(paragraphs) == 1:
        paragraphs = [p for p in text.split("\n") if p.strip()] or paragraphs
    quote_norm = re.sub(r"\s+", " ", quote.strip()).lower()
    for para in paragraphs:
        para_norm = re.sub(r"\s+", " ", para.strip()).lower()
        if quote_norm and quote_norm in para_norm:
            return para.strip()
    full_norm = re.sub(r"\s+", " ", text.strip()).lower()
    if quote_norm and quote_norm in full_norm:
        return text.strip()
    return None


def is_ideas_underdeveloped_false_positive(error: dict, user_answer: str) -> bool:
    """True only when text after the quote has explicit support cues."""
    if error.get("error_id") != "ideas_underdeveloped":
        return False
    quote = (error.get("original_text") or "").strip()
    if not quote:
        return False
    para = paragraph_containing(user_answer, quote)
    if not para:
        return False
    quote_norm = re.sub(r"\s+", " ", quote).lower()
    para_norm = re.sub(r"\s+", " ", para).lower()
    idx = para_norm.find(quote_norm)
    if idx < 0:
        return False
    after = para_norm[idx + len(quote_norm):].strip()
    if not after:
        return False
    return bool(_SUPPORT_CUE_RE.search(after))


def has_paragraph_breaks(text: str) -> bool:
    if not text:
        return False
    if "\n\n" in text:
        return True
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


def dedupe_pattern_errors(errors: List[dict]) -> List[dict]:
    """
    Collapse pattern-level errors by (error_id, severity).

    Five medium overuse_linkers → one medium card (examples merged).
    A high and a medium overuse_linkers → two cards, one per severity.
    """
    if not errors:
        return errors

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

    for key, (idx, kept, snippets) in list(groups.items()):
        unique = [s for s in snippets if s]
        if len(unique) > 1:
            examples = "; ".join(f'"{s}"' for s in unique[:8])
            expl = (kept.get("explanation") or "").rstrip()
            suffix = f" Examples across the text: {examples}."
            if suffix.strip() not in expl:
                kept["explanation"] = (expl + suffix).strip()
            if unique:
                kept["original_text"] = unique[0]
                kept["context"] = (
                    (kept.get("context") or "")
                    + (f" Also: {', '.join(unique[1:6])}." if len(unique) > 1 else "")
                ).strip()
        groups[key] = (idx, kept, snippets)

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
    normalized = re.sub(r"([.!?])[ \t]{2,}", r"\1\n\n", text)
    return normalized


# ---------------------------------------------------------------------------
# Single entry point used by all graders
# ---------------------------------------------------------------------------

def postprocess_detected_errors(
    errors: List[dict],
    user_answer: str,
) -> Tuple[List[dict], PostprocessStats]:
    """
    Apply all shared safety nets in a fixed order.

    Order matches the previous per-grader pipelines (data-accuracy → placeholder
    → ideas_underdeveloped → structure artifact → pattern dedupe). Filters that
    do not apply to a given error_id leave that error unchanged.
    """
    stats = PostprocessStats()
    if not errors:
        return errors, stats

    answer = user_answer or ""

    before = len(errors)
    errors = [e for e in errors if not is_self_contradicting_data_accuracy_error(e)]
    stats.data_accuracy_dropped = before - len(errors)

    before = len(errors)
    errors = [e for e in errors if not has_unusable_placeholder_correction(e)]
    stats.placeholder_correction_dropped = before - len(errors)

    before = len(errors)
    errors = [e for e in errors if not is_ideas_underdeveloped_false_positive(e, answer)]
    stats.ideas_underdeveloped_dropped = before - len(errors)

    before = len(errors)
    errors = [e for e in errors if not is_poor_overall_structure_paragraph_artifact(e, answer)]
    stats.poor_overall_structure_dropped = before - len(errors)

    before = len(errors)
    errors = dedupe_pattern_errors(errors)
    stats.pattern_deduped = before - len(errors)

    return errors, stats


def log_postprocess_stats(logger, criterion_name: str, stats: PostprocessStats) -> None:
    """Emit the same granular log lines graders used before consolidation."""
    if stats.data_accuracy_dropped:
        logger.info(
            f"  → [{criterion_name}] dropped {stats.data_accuracy_dropped} self-contradicting "
            "data_accuracy_error false positive(s)."
        )
    if stats.placeholder_correction_dropped:
        logger.info(
            f"  → [{criterion_name}] dropped {stats.placeholder_correction_dropped} error(s) with an "
            "unusable placeholder correction."
        )
    if stats.ideas_underdeveloped_dropped:
        logger.info(
            f"  → [{criterion_name}] dropped {stats.ideas_underdeveloped_dropped} "
            "ideas_underdeveloped false positive(s) (support cues after quote)."
        )
    if stats.poor_overall_structure_dropped:
        logger.info(
            f"  → [{criterion_name}] dropped {stats.poor_overall_structure_dropped} "
            "poor_overall_structure false positive(s) (paragraph input artifact)."
        )
    if stats.pattern_deduped:
        logger.info(
            f"  → [{criterion_name}] deduped {stats.pattern_deduped} "
            "pattern-level error(s)."
        )
