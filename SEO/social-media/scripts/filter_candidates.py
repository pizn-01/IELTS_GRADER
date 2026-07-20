"""
LLM + heuristic relevance filter for discovery CSVs before triage.

Hard rules first (URL normalize, engaged/seen memory, off-topic keywords),
then optional LLM scoring for relevance / benefit / CTA-fit.
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from agent_io import THIS_WEEK, blocked_urls, ensure_output_dirs
from agent_rules import classify_intent, is_high_intent
from common import normalize_url, write_csv, ResultRow
from llm_client import llm_complete

OFFTOPIC = re.compile(
    r"\b(speaking only|listening only|reading only|toefl|pte\b|duolingo english|"
    r"visa interview|gre\b|gmat|sat prep)\b",
    re.I,
)

RELEVANT = re.compile(
    r"\b(ielts|task\s*[12]|writing|essay|band|coherence|lexical|grammar|"
    r"feedback|grade my|check my|tutor|correction)\b",
    re.I,
)


@dataclass
class FilterResult:
    url: str
    platform: str
    title: str
    snippet: str
    query: str
    engagement_score: str
    pass_: bool
    relevance: float
    benefit: float
    cta_ok: bool
    reason: str
    intent: str = ""


def _heuristic(row: dict[str, str]) -> FilterResult:
    url = normalize_url(row.get("url") or "")
    title = row.get("title") or ""
    snippet = row.get("snippet") or ""
    text = f"{title} {snippet}"
    platform = (row.get("platform") or "").lower()
    intent = classify_intent(title, snippet)

    if not url:
        return FilterResult(
            url="",
            platform=platform,
            title=title,
            snippet=snippet,
            query=row.get("query") or "",
            engagement_score=row.get("engagement_score") or "",
            pass_=False,
            relevance=0,
            benefit=0,
            cta_ok=False,
            reason="empty_url",
            intent=intent,
        )

    if OFFTOPIC.search(text) and not RELEVANT.search(text):
        return FilterResult(
            url=url,
            platform=platform,
            title=title,
            snippet=snippet,
            query=row.get("query") or "",
            engagement_score=row.get("engagement_score") or "",
            pass_=False,
            relevance=0.1,
            benefit=0.1,
            cta_ok=False,
            reason="offtopic",
            intent=intent,
        )

    if not RELEVANT.search(text):
        return FilterResult(
            url=url,
            platform=platform,
            title=title,
            snippet=snippet,
            query=row.get("query") or "",
            engagement_score=row.get("engagement_score") or "",
            pass_=False,
            relevance=0.2,
            benefit=0.2,
            cta_ok=False,
            reason="low_relevance_keywords",
            intent=intent,
        )

    rel = 0.55
    ben = 0.5
    if is_high_intent(intent):
        rel += 0.25
        ben += 0.2
    if intent == "tool_ask":
        rel += 0.1
        ben += 0.15
    if platform in ("reddit", "quora", "twitter"):
        rel += 0.05
    cta_ok = intent in ("tool_ask", "feedback_ask")
    return FilterResult(
        url=url,
        platform=platform,
        title=title,
        snippet=snippet,
        query=row.get("query") or "",
        engagement_score=row.get("engagement_score") or "",
        pass_=rel >= 0.5 and ben >= 0.4,
        relevance=min(rel, 1.0),
        benefit=min(ben, 1.0),
        cta_ok=cta_ok,
        reason="heuristic_pass" if rel >= 0.5 else "heuristic_weak",
        intent=intent,
    )


def _llm_batch_score(
    candidates: list[FilterResult],
    *,
    dry_run: bool = False,
) -> list[FilterResult]:
    """Ask LLM to confirm/adjust a batch; falls back to heuristics on failure."""
    if not candidates or dry_run:
        return candidates
    # Cap batch size for cost
    batch = candidates[:40]
    lines = []
    for i, c in enumerate(batch):
        lines.append(
            f"{i}. [{c.platform}] {c.title[:100]}\n   {(c.snippet or '')[:160]}"
        )
    system = (
        "You filter social posts for an IELTS Writing tutor brand. "
        "For each numbered item return JSON array of objects with keys: "
        "i (int), pass (bool), relevance (0-1), benefit (0-1), cta_ok (bool), reason (short). "
        "pass=true only if we can give useful IELTS writing help. "
        "cta_ok=true only if mentioning a free essay checker is natural (they ask for a tool/score/check). "
        "Reject off-topic, pure speaking/listening, visa-only, or spam. Reply with JSON only."
    )
    user = "Score these:\n" + "\n".join(lines)
    raw = llm_complete(system, user, dry_run=dry_run)
    try:
        start = raw.find("[")
        end = raw.rfind("]")
        if start == -1 or end == -1:
            return candidates
        data = json.loads(raw[start : end + 1])
    except (json.JSONDecodeError, TypeError):
        return candidates

    by_i = {int(d.get("i")): d for d in data if isinstance(d, dict) and "i" in d}
    out: list[FilterResult] = []
    for i, c in enumerate(batch):
        d = by_i.get(i)
        if not d:
            out.append(c)
            continue
        out.append(
            FilterResult(
                url=c.url,
                platform=c.platform,
                title=c.title,
                snippet=c.snippet,
                query=c.query,
                engagement_score=c.engagement_score,
                pass_=bool(d.get("pass", c.pass_)),
                relevance=float(d.get("relevance", c.relevance) or 0),
                benefit=float(d.get("benefit", c.benefit) or 0),
                cta_ok=bool(d.get("cta_ok", c.cta_ok)),
                reason=str(d.get("reason") or c.reason)[:120],
                intent=c.intent,
            )
        )
    # Keep remaining beyond batch as heuristic
    out.extend(candidates[40:])
    return out


def filter_discovery_csv(
    csv_path: Path,
    *,
    out_csv: Optional[Path] = None,
    meta_path: Optional[Path] = None,
    dry_run: bool = False,
    use_llm: bool = True,
) -> tuple[Path, dict[str, Any]]:
    """Filter a discovery CSV → write filtered CSV + meta JSON. Returns (path, summary)."""
    ensure_output_dirs()
    blocked = blocked_urls()
    with csv_path.open(newline="", encoding="utf-8") as f:
        raw = list(csv.DictReader(f))

    hard_pass: list[FilterResult] = []
    rejected: list[FilterResult] = []
    for row in raw:
        url = normalize_url(row.get("url") or "")
        key = url.lower().rstrip("/")
        if key and key in blocked:
            rejected.append(
                FilterResult(
                    url=url,
                    platform=(row.get("platform") or "").lower(),
                    title=row.get("title") or "",
                    snippet=row.get("snippet") or "",
                    query=row.get("query") or "",
                    engagement_score=row.get("engagement_score") or "",
                    pass_=False,
                    relevance=0,
                    benefit=0,
                    cta_ok=False,
                    reason="seen_or_engaged",
                    intent=classify_intent(row.get("title") or "", row.get("snippet") or ""),
                )
            )
            continue
        fr = _heuristic(row)
        if fr.pass_:
            hard_pass.append(fr)
        else:
            rejected.append(fr)

    # Rank heuristics, LLM-score top slice
    hard_pass.sort(key=lambda x: (x.relevance + x.benefit), reverse=True)
    if use_llm and hard_pass:
        scored = _llm_batch_score(hard_pass, dry_run=dry_run)
    else:
        scored = hard_pass

    passed = [c for c in scored if c.pass_]
    for c in scored:
        if not c.pass_:
            rejected.append(c)

    out_csv = out_csv or (THIS_WEEK / "_meta" / "filtered_discovery.csv")
    meta_path = meta_path or (THIS_WEEK / "_meta" / "filter_summary.json")
    out_csv.parent.mkdir(parents=True, exist_ok=True)

    rows_out: list[ResultRow] = []
    for c in passed:
        rows_out.append(
            ResultRow(
                platform=c.platform,
                url=c.url,
                title=c.title,
                snippet=c.snippet,
                query=c.query,
                engagement_score=c.engagement_score or "",
                source="filtered",
                notes=f"cta_ok={1 if c.cta_ok else 0};{c.reason}",
            )
        )
    write_csv(out_csv, rows_out)

    # Side channel: cta_ok map for triage
    cta_map = {normalize_url(c.url).lower().rstrip("/"): c.cta_ok for c in passed}
    summary = {
        "input_rows": len(raw),
        "after_hard_block": len(hard_pass),
        "passed": len(passed),
        "rejected": len(rejected),
        "cta_ok_count": sum(1 for c in passed if c.cta_ok),
        "csv": str(out_csv),
        "cta_map": cta_map,
        "reject_reasons": _reason_counts(rejected),
    }
    meta_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(
        f"Filter: {len(raw)} → {len(passed)} pass "
        f"(blocked/reject {len(rejected)}; cta_ok={summary['cta_ok_count']})",
        flush=True,
    )
    return out_csv, summary


def _reason_counts(items: list[FilterResult]) -> dict[str, int]:
    from collections import Counter

    return dict(Counter(c.reason for c in items))


def load_cta_map(meta_path: Optional[Path] = None) -> dict[str, bool]:
    path = meta_path or (THIS_WEEK / "_meta" / "filter_summary.json")
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {k: bool(v) for k, v in (data.get("cta_map") or {}).items()}
    except (json.JSONDecodeError, OSError):
        return {}
