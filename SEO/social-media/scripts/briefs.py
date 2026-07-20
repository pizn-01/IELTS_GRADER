"""Build WEEK_BRIEF.md and TODAY.md with KPI strip + ordered actions."""

from __future__ import annotations

from pathlib import Path

from agent_io import (
    THIS_WEEK,
    ensure_output_dirs,
    pending_actions,
    read_status,
    sort_for_today,
    weekday_label,
    write_open_me,
)
from agent_rules import PLAYBOOK_REMEMBER
from scorecard import kpi_strip, write_scorecard


def _line_for(r: dict[str, str]) -> str:
    aid = r.get("id") or ""
    plat = r.get("platform") or ""
    typ = r.get("type") or ""
    title = (r.get("title") or "")[:70]
    fpath = r.get("action_file") or ""
    flag = ""
    if (r.get("status") or "") == "awaiting_reply" or typ == "followup":
        flag = " **FOLLOW-UP**"
    elif (r.get("fresh") or "") == "1":
        flag = " **FRESH**"
    elif (r.get("day") or "") == "Fri" and typ == "reply":
        flag = " **DEEP**"
    return f"- `{aid}` · {plat} · {typ}{flag} — {title}  \n  File: `actions/{Path(fpath).name if fpath else '?'}` · Open: {r.get('url') or ''}"


def write_today_brief() -> Path:
    ensure_output_dirs()
    write_scorecard()
    today = weekday_label()
    rows = sort_for_today(pending_actions(day=today, include_overdue=True))
    # include followup type pending from draft_followups
    extra = [
        r
        for r in read_status()
        if r.get("status") == "pending" and r.get("type") == "followup" and r.get("day") == today
    ]
    seen = {r.get("id") for r in rows}
    for r in extra:
        if r.get("id") not in seen:
            rows.append(r)
    rows = sort_for_today(rows)

    followups = [r for r in rows if r.get("type") == "followup" or r.get("status") == "awaiting_reply"]
    # awaiting_reply aren't paste actions themselves — followup drafts are
    followups = [r for r in rows if r.get("type") == "followup"]
    fresh = [r for r in rows if r.get("fresh") == "1" and r not in followups]
    tier1 = [
        r
        for r in rows
        if r.get("tier") == "1"
        and r.get("type") in ("reply", "engage", "comment")
        and r not in followups
        and r not in fresh
    ]
    creates = [
        r
        for r in rows
        if r.get("type")
        in ("post", "short_script", "caption", "stories", "page_post", "answer")
    ]
    rest = [
        r
        for r in rows
        if r not in followups and r not in fresh and r not in tier1 and r not in creates
    ]

    deep = []
    if today == "Fri":
        deep = [r for r in rows if r.get("day") == "Fri" and r.get("type") == "reply"]

    parts = [
        f"# TODAY — {today}",
        "",
        f"**Progress:** {kpi_strip()}",
        "",
        "How to work: menu **3** copies the next paste · menu **4** marks done.",
        "",
        PLAYBOOK_REMEMBER,
        "",
    ]
    if deep:
        parts.append("## Deep replies (do these first on Friday)")
        parts.extend(_line_for(r) for r in deep)
        parts.append("")
    if followups:
        parts.append("## Follow-ups (conversations convert)")
        parts.extend(_line_for(r) for r in followups)
        parts.append("")
    if fresh:
        parts.append("## Fresh / same-day high-intent")
        parts.extend(_line_for(r) for r in fresh)
        parts.append("")
    if tier1:
        parts.append("## Tier-1 engages (Reddit / Quora / X)")
        parts.extend(_line_for(r) for r in tier1)
        parts.append("")
    if creates:
        parts.append("## Create today (scripts / captions / posts)")
        parts.extend(_line_for(r) for r in creates)
        parts.append("")
    if rest:
        parts.append("## Other")
        parts.extend(_line_for(r) for r in rest)
        parts.append("")
    if not rows:
        parts.append("_Nothing pending for today. Catch up overdue or run menu 1 for a new week._")
        parts.append("")

    path = THIS_WEEK / "TODAY.md"
    path.write_text("\n".join(parts), encoding="utf-8")
    write_open_me("today")
    return path


def write_week_brief() -> Path:
    ensure_output_dirs()
    write_scorecard()
    rows = read_status()
    by_day: dict[str, list] = {}
    for r in rows:
        if r.get("status") not in ("pending", "awaiting_reply"):
            continue
        by_day.setdefault(r.get("day") or "?", []).append(r)

    parts = [
        "# WEEK BRIEF",
        "",
        f"**Progress:** {kpi_strip()}",
        "",
        "This file plans the whole week. Each day open **TODAY** via menu **2**.",
        "",
        f"Optional: import `{THIS_WEEK / 'schedule_export.csv'}` into Buffer/Later "
        "(never for Reddit spam).",
        "",
        PLAYBOOK_REMEMBER,
        "",
    ]
    for day in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"):
        day_rows = by_day.get(day) or []
        parts.append(f"## {day} ({len(day_rows)} actions)")
        if not day_rows:
            parts.append("_None slotted._")
        else:
            for r in sort_for_today(day_rows)[:40]:
                parts.append(_line_for(r))
        parts.append("")

    path = THIS_WEEK / "WEEK_BRIEF.md"
    path.write_text("\n".join(parts), encoding="utf-8")
    write_open_me("week")
    return path
