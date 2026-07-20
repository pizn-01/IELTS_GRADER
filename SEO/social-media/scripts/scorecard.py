"""Playbook §8 scorecard from STATUS.csv."""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

from agent_io import SCORECARDS_PATH, THIS_WEEK, ensure_output_dirs, read_status
from agent_rules import KPI_HIGH_INTENT, KPI_POSTS, KPI_REPLIES, PLAYBOOK_REMEMBER


CREATE_TYPES = {
    "post",
    "short_script",
    "caption",
    "stories",
    "page_post",
    "answer",
    "group_comment",
}
ENGAGE_TYPES = {"reply", "comment", "engage", "followup", "group_comment"}


def kpi_counts(rows: list[dict[str, str]] | None = None) -> dict[str, int]:
    rows = rows if rows is not None else read_status()
    replies_done = 0
    posts_done = 0
    high_intent_done = 0
    followups_waiting = 0
    replies_pending = 0
    posts_pending = 0

    for r in rows:
        typ = (r.get("type") or "").lower()
        st = (r.get("status") or "").lower()
        hi = (r.get("high_intent") or "") == "1"
        is_create = typ in CREATE_TYPES and typ != "group_comment"
        # group_comment counts as engage for KPI replies when done from groups;
        # page creates are posts. Treat short_script as the "post" unit (not each caption).
        if typ == "short_script":
            is_create = True
        elif typ in ("caption", "stories"):
            is_create = False  # repurpose of short — don't double-count posts KPI
        is_engage = typ in ENGAGE_TYPES or typ == "group_comment"

        if st == "awaiting_reply":
            followups_waiting += 1
        if st == "done":
            if is_engage or typ == "reply":
                replies_done += 1
                if hi:
                    high_intent_done += 1
            if is_create or typ in ("post", "answer", "page_post", "short_script"):
                if typ in ("post", "answer", "page_post", "short_script"):
                    posts_done += 1
        if st == "pending":
            if is_engage or typ == "reply":
                replies_pending += 1
            if typ in ("post", "answer", "page_post", "short_script"):
                posts_pending += 1

    return {
        "replies_done": replies_done,
        "posts_done": posts_done,
        "high_intent_done": high_intent_done,
        "followups_waiting": followups_waiting,
        "replies_pending": replies_pending,
        "posts_pending": posts_pending,
    }


def kpi_strip(counts: dict[str, int] | None = None) -> str:
    c = counts or kpi_counts()
    return (
        f"Replies {c['replies_done']}/{KPI_REPLIES} · "
        f"Posts {c['posts_done']}/{KPI_POSTS} · "
        f"High-intent {c['high_intent_done']}/{KPI_HIGH_INTENT} · "
        f"Follow-ups waiting {c['followups_waiting']}"
    )


def write_scorecard(*, notes: str = "") -> Path:
    ensure_output_dirs()
    c = kpi_counts()
    path = THIS_WEEK / "_meta" / "scorecard.md"
    default_notes = (
        "- Bio/profile clicks this week:\n- Free evaluations attributed:\n"
    )
    notes_block = notes or default_notes
    strip = kpi_strip(c)
    path.write_text(
        f"""# Weekly scorecard (playbook section 8)

**Progress:** {strip}

| Metric | Target | Done |
|--------|--------|------|
| Helpful replies (all platforms) | >= {KPI_REPLIES} | {c['replies_done']} |
| Original posts / Shorts (with repurposing) | >= {KPI_POSTS} | {c['posts_done']} |
| High-intent threads engaged | >= {KPI_HIGH_INTENT} | {c['high_intent_done']} |
| Bio / profile link clicks | Track in Insights | (fill below) |
| Free evaluations from social | Track UTMs | (fill below) |

## Notes (you fill)
{notes_block}

## Pending still open
- Replies pending: {c['replies_pending']}
- Posts pending: {c['posts_pending']}
- Follow-ups waiting: {c['followups_waiting']}

---
{PLAYBOOK_REMEMBER}
""",
        encoding="utf-8",
    )
    return path


def append_scorecards_csv() -> None:
    ensure_output_dirs()
    c = kpi_counts()
    new_file = not SCORECARDS_PATH.exists()
    with SCORECARDS_PATH.open("a", newline="", encoding="utf-8") as f:
        fields = [
            "date",
            "replies_done",
            "posts_done",
            "high_intent_done",
            "followups_waiting",
        ]
        w = csv.DictWriter(f, fieldnames=fields)
        if new_file:
            w.writeheader()
        w.writerow(
            {
                "date": date.today().isoformat(),
                "replies_done": c["replies_done"],
                "posts_done": c["posts_done"],
                "high_intent_done": c["high_intent_done"],
                "followups_waiting": c["followups_waiting"],
            }
        )
