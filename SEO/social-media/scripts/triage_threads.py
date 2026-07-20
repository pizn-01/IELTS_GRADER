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
    ENGAGE_SLOT_DAYS,
    ENGAGE_TARGET,
    KPI_HIGH_INTENT,
    classify_intent,
    is_high_intent,
    platform_tier,
    ranking_score,
)
from agent_io import load_engaged_urls
from common import normalize_url


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
) -> list[TriageItem]:
    engaged = load_engaged_urls()
    raw = _read_csv_rows(csv_path)
    items: list[TriageItem] = []

    for row in raw:
        url = normalize_url(row.get("url") or "")
        if not url or url.lower().rstrip("/") in engaged:
            continue
        platform = (row.get("platform") or "unknown").lower()
        title = row.get("title") or ""
        snippet = row.get("snippet") or ""
        intent = classify_intent(title, snippet)
        score = ranking_score(
            platform=platform,
            engagement_score=row.get("engagement_score") or "",
            intent=intent,
            title=title,
            snippet=snippet,
        )
        if intent == "tool_ask":
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
            )
        )

    items.sort(key=lambda x: x.score, reverse=True)

    if mode == "cold_start":
        # Learn-not-spam: keep top evergreen for study; mark observe
        for it in items:
            it.day = "Study"
            it.action = "observe_only"
        return items[:40]

    if fresh:
        items = items[:fresh_cap]
        for it in items:
            it.day = _today_label()
        return items

    # Cap / pad toward engage target
    selected = items[: max(target_engage, KPI_HIGH_INTENT)]
    _assign_days(selected)
    return selected


def _today_label() -> str:
    from agent_io import weekday_label

    return weekday_label()


def _assign_days(items: list[TriageItem]) -> None:
    if not items:
        return
    # Highest engagement → Fri deep (top ~20%)
    deep_n = max(3, len(items) // 5)
    deep = items[:deep_n]
    rest = items[deep_n:]

    for it in deep:
        it.day = DEEP_DAY

    # Always reserve a Monday starter batch
    mon_n = min(8, max(3, len(rest) // 5)) if rest else 0
    for it in rest[:mon_n]:
        it.day = "Mon"
    rest = rest[mon_n:]

    slots = list(ENGAGE_SLOT_DAYS)
    for i, it in enumerate(rest):
        it.day = slots[i % len(slots)]


def items_to_dicts(items: list[TriageItem]) -> list[dict]:
    return [asdict(i) for i in items]


def write_triage_json(path: Path, items: list[TriageItem]) -> None:
    import json

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(items_to_dicts(items), indent=2), encoding="utf-8"
    )
