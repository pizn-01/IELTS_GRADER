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


# Multipliers for magnitude-normalised comparison (same unit family only).
_UNIT_MULT = {
    "billion": 1e9,
    "bn": 1e9,
    "million": 1e6,
    "m": 1e6,
    "thousand": 1e3,
    "k": 1e3,
    "%": 1.0,
    "percent": 1.0,
    "percentage": 1.0,
}

# Number token: comma-grouped (1,000), decimal (39.6), or full integer (1990).
# Do NOT use \d{1,3} alone — that truncates years like 1990 → 199.
_NUM = r"(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+)"

# Student/report figure … chart/reference figure (order matters).
_STUDENT_VS_REF_RE = re.compile(
    r"(?:report|student|candidate|answer|text|wrote|states?|claims?|says?|mentions?|"
    r"gives?|cites?|puts?|lists?)"
    r".{0,80}?"
    r"(?:around|about|approximately|roughly|nearly|just over|just under|at|is|was|of|to)?\s*"
    rf"(?P<student>{_NUM})"
    r"(?:\s*(?P<sunit>billion|million|thousand|percent(?:age)?|bn|[mk]%?|%))?"
    r".{0,100}?"
    r"(?:but|while|whereas|however|chart|graph|table|reference|source|actual|true|correct|shows?|is|was)"
    r".{0,60}?"
    r"(?:around|about|approximately|roughly|nearly|just over|just under|at|is|was|of|to|shows?)?\s*"
    rf"(?P<ref>{_NUM})"
    r"(?:\s*(?P<runit>billion|million|thousand|percent(?:age)?|bn|[mk]%?|%))?",
    re.IGNORECASE | re.DOTALL,
)

# Fallback: "X … but … Y" / "X, chart shows Y"
_LOOSE_PAIR_RE = re.compile(
    rf"(?P<student>{_NUM})"
    r"(?:\s*(?P<sunit>billion|million|thousand|percent(?:age)?|bn|[mk]%?|%))?"
    r".{0,50}?"
    r"(?:but|while|whereas|chart|graph|reference|shows?|actual)"
    r".{0,40}?"
    rf"(?P<ref>{_NUM})"
    r"(?:\s*(?P<runit>billion|million|thousand|percent(?:age)?|bn|[mk]%?|%))?",
    re.IGNORECASE | re.DOTALL,
)

_DATA_ACCURACY_TOLERANCE = 0.15  # ±15%


def _parse_number_token(raw: str) -> Optional[float]:
    try:
        return float(raw.replace(",", ""))
    except (TypeError, ValueError):
        return None


def _normalize_unit(unit: Optional[str]) -> Optional[str]:
    if not unit:
        return None
    u = unit.lower().rstrip(".")
    if u in ("m",) and u not in _UNIT_MULT:
        return "million"
    if u == "bn":
        return "billion"
    if u in ("%", "percent", "percentage"):
        return "%"
    return u if u in _UNIT_MULT else None


def _to_base(value: float, unit: Optional[str]) -> float:
    key = _normalize_unit(unit)
    if key and key in _UNIT_MULT:
        return value * _UNIT_MULT[key]
    return value


def _looks_like_year(n: float) -> bool:
    return n == int(n) and 1900 <= int(n) <= 2100


def _extract_student_ref_pair(error: dict) -> Optional[Tuple[float, float]]:
    """
    Pull (student_value, reference_value) from explanation/context when possible.
    Returns None if the pair cannot be parsed confidently.
    """
    text = f"{error.get('explanation', '')} {error.get('context', '')}"
    if not text.strip():
        return None

    for pattern in (_STUDENT_VS_REF_RE, _LOOSE_PAIR_RE):
        m = pattern.search(text)
        if not m:
            continue
        student = _parse_number_token(m.group("student"))
        ref = _parse_number_token(m.group("ref"))
        if student is None or ref is None or ref == 0:
            continue
        # Years: percentage tolerance is meaningless (1990 vs 1997 ≈ 0.35%).
        if _looks_like_year(student) and _looks_like_year(ref):
            return None
        sunit = m.groupdict().get("sunit")
        runit = m.groupdict().get("runit")
        # If both units present and differ in a way we can't reconcile, skip.
        su, ru = _normalize_unit(sunit), _normalize_unit(runit)
        if su and ru and su != ru and {su, ru} != {"%", "%"}:
            # Allow billion/million mismatch only via base conversion
            pass
        student_b = _to_base(student, sunit)
        ref_b = _to_base(ref, runit)
        if ref_b == 0:
            continue
        return student_b, ref_b

    # Fallback: numbers in original_text vs corrected_text (same unit assumed).
    o_m = re.search(rf"({_NUM})", error.get("original_text") or "")
    c_m = re.search(rf"({_NUM})", error.get("corrected_text") or "")
    if o_m and c_m:
        student = _parse_number_token(o_m.group(1))
        ref = _parse_number_token(c_m.group(1))
        if student is not None and ref is not None and ref != 0:
            if _looks_like_year(student) and _looks_like_year(ref):
                return None
            return student, ref
    return None


def is_within_tolerance_data_accuracy_error(error: dict) -> bool:
    """
    Drop data_accuracy_error when student vs reference magnitudes differ by ≤15%,
    even if the model still calls it a 'mismatch'. Leave the error if numbers
    cannot be parsed confidently.
    """
    if error.get("error_id") != "data_accuracy_error":
        return False
    pair = _extract_student_ref_pair(error)
    if not pair:
        return False
    student, ref = pair
    pct = abs(student - ref) / abs(ref)
    return pct <= _DATA_ACCURACY_TOLERANCE


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
    errors = [
        e for e in errors
        if not (
            is_self_contradicting_data_accuracy_error(e)
            or is_within_tolerance_data_accuracy_error(e)
        )
    ]
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
            f"  → [{criterion_name}] dropped {stats.data_accuracy_dropped} "
            "data_accuracy_error false positive(s) (within tolerance / self-contradicting)."
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
