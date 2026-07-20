"""
Triage weekly/historical/fresh CSVs → ranked engage candidates with day slots.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

from agent_rules import (
    DEEP_DAY,
    ENGAGE_MAX,
    ENGAGE_TARGET,
    KPI_HIGH_INTENT,
    ONBOARDING_ENGAGE_TARGET,
    WEEKDAYS,
    classify_intent,
    is_high_intent,
    platform_tier,
    ranking_score,
)
from agent_io import blocked_urls, remember_urls
from common import normalize_url
from filter_candidates import load_cta_map


@dataclass
class TriageItem:
    platform: str
    url: str
    title: str
    snippet: str
    engagement_score: str
    intent: str
    high_intent: bool
    tier: int
    score: float
    day: str
    action: str  # value_reply | soft_cta_ok | observe_only
    source_query: str = ""
    fresh: bool = False
    cta_ok: bool = False


def _read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def triage_csv(
    csv_path: Path,
    *,
    mode: str = "weekly",
    target_engage: int = ENGAGE_TARGET,
    fresh: bool = False,
    fresh_cap: int = 8,
    cta_map: Optional[dict[str, bool]] = None,
    remember: bool = True,
    skip_urls: Optional[set[str]] = None,
) -> list[TriageItem]:
    blocked = blocked_urls()
    if skip_urls:
        blocked = blocked | {u.lower().rstrip("/") for u in skip_urls}
    cta_map = cta_map if cta_map is not None else load_cta_map()
    raw = _read_csv_rows(csv_path)
    items: list[TriageItem] = []

    for row in raw:
        url = normalize_url(row.get("url") or "")
        key = url.lower().rstrip("/")
        if not url or key in blocked:
            continue
        platform = (row.get("platform") or "unknown").lower()
        title = row.get("title") or ""
        snippet = row.get("snippet") or ""
        intent = classify_intent(title, snippet)
        notes = row.get("notes") or ""
        cta_ok = bool(cta_map.get(key))
        if "cta_ok=1" in notes:
            cta_ok = True
        score = ranking_score(
            platform=platform,
            engagement_score=row.get("engagement_score") or "",
            intent=intent,
            title=title,
            snippet=snippet,
        )
        if intent == "tool_ask" or cta_ok:
            action = "soft_cta_ok"
        elif mode == "cold_start":
            action = "observe_only"
        else:
            action = "value_reply"

        items.append(
            TriageItem(
                platform=platform,
                url=url,
                title=title,
                snippet=snippet,
                engagement_score=row.get("engagement_score") or "",
                intent=intent,
                high_intent=is_high_intent(intent),
                tier=platform_tier(platform),
                score=score,
                day="",  # filled below
                action=action,
                source_query=row.get("query") or "",
                fresh=fresh,
                cta_ok=cta_ok or intent == "tool_ask",
            )
        )

    items.sort(key=lambda x: x.score, reverse=True)

    if mode == "onboarding":
        # Free-time engage pack (not weekly Mon–Fri slots)
        target = target_engage or ONBOARDING_ENGAGE_TARGET
        selected = items[: max(target, KPI_HIGH_INTENT)]
        for it in selected:
            it.day = "Free"
            if it.action == "observe_only":
                it.action = "value_reply"
        if remember:
            remember_urls(
                [{"url": it.url, "platform": it.platform} for it in selected],
                reason="onboarding_queued",
            )
        return selected

    if mode == "cold_start":
        for it in items:
            it.day = "Study"
            it.action = "observe_only"
        selected = items[:40]
        if remember:
            remember_urls(
                [{"url": it.url, "platform": it.platform} for it in selected],
                reason="cold_start_study",
            )
        return selected

    if fresh:
        items = items[:fresh_cap]
        for it in items:
            it.day = _today_label()
        if remember:
            remember_urls(
                [{"url": it.url, "platform": it.platform} for it in items],
                reason="fresh_queued",
            )
        return items

    # Weekly: take up to target (≈ filtered discovery N), safety-capped
    cap = min(max(target_engage, KPI_HIGH_INTENT), ENGAGE_MAX)
    selected = items[:cap]
    _assign_days(selected)
    if remember:
        remember_urls(
            [{"url": it.url, "platform": it.platform} for it in selected],
            reason="weekly_queued",
        )
    return selected


def _today_label() -> str:
    from agent_io import weekday_label

    return weekday_label()


def _assign_days(items: list[TriageItem]) -> None:
    """Spread N items across Mon–Sun so each day ≈ N/7 (remainder on later days)."""
    if not items:
        return
    n = len(items)
    days = list(WEEKDAYS)
    base = n // 7
    extra = n % 7
    # Later days of the week absorb the remainder so Mon isn't overloaded
    counts = [base + (1 if i >= 7 - extra else 0) for i in range(7)]
    idx = 0
    for day, count in zip(days, counts):
        for _ in range(count):
            if idx >= n:
                return
            items[idx].day = day
            idx += 1
    # Fallback if anything left
    while idx < n:
        items[idx].day = days[idx % 7]
        idx += 1


def items_to_dicts(items: list[TriageItem]) -> list[dict]:
    return [asdict(i) for i in items]


def write_triage_json(path: Path, items: list[TriageItem]) -> None:
    import json

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(items_to_dicts(items), indent=2), encoding="utf-8"
    )


def load_triage_json(path: Path) -> list[TriageItem]:
    """Rebuild TriageItem list from a persisted engage_queue.json."""
    import json

    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    if not isinstance(raw, list):
        return []
    items: list[TriageItem] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        url = (row.get("url") or "").strip()
        if not url:
            continue
        items.append(
            TriageItem(
                platform=(row.get("platform") or "unknown").lower(),
                url=url,
                title=row.get("title") or "",
                snippet=row.get("snippet") or "",
                engagement_score=str(row.get("engagement_score") or ""),
                intent=row.get("intent") or "general_tip",
                high_intent=bool(row.get("high_intent")),
                tier=int(row.get("tier") or platform_tier(row.get("platform") or "")),
                score=float(row.get("score") or 0),
                day=row.get("day") or "",
                action=row.get("action") or "value_reply",
                source_query=row.get("source_query") or "",
                fresh=bool(row.get("fresh")),
                cta_ok=bool(row.get("cta_ok")),
            )
        )
    return items
