"""Playbook §8 scorecard from STATUS.csv."""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

from agent_io import SCORECARDS_PATH, THIS_WEEK, ensure_output_dirs, read_status
from agent_rules import (
    CTA_ENGAGE_SHARE,
    KPI_HIGH_INTENT,
    KPI_POSTS,
    KPI_REPLIES,
    PLAYBOOK_REMEMBER,
)


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
    followups_completed = 0
    replies_pending = 0
    posts_pending = 0
    cta_replies_planned = 0
    cta_replies_done = 0
    cta_posts_planned = 0
    cta_posts_done = 0

    for r in rows:
        typ = (r.get("type") or "").lower()
        st = (r.get("status") or "").lower()
        hi = (r.get("high_intent") or "") == "1"
        cta = (r.get("cta") or "") == "1"
        is_create = typ in CREATE_TYPES and typ != "group_comment"
        if typ == "short_script":
            is_create = True
        elif typ in ("caption", "stories"):
            is_create = False
        is_engage = typ in ENGAGE_TYPES or typ == "group_comment"

        if st == "awaiting_reply":
            followups_waiting += 1
        if st in ("got_reply",) or (
            typ == "followup" and st == "done"
        ):
            followups_completed += 1
        if typ == "followup" and st == "done":
            pass  # counted above
        if st == "done":
            if is_engage or typ == "reply":
                replies_done += 1
                if hi:
                    high_intent_done += 1
                if cta:
                    cta_replies_done += 1
            if is_create or typ in ("post", "answer", "page_post", "short_script"):
                if typ in ("post", "answer", "page_post", "short_script"):
                    posts_done += 1
                    if cta:
                        cta_posts_done += 1
        if st in ("pending", "awaiting_reply", "got_reply"):
            if (is_engage or typ == "reply") and cta:
                cta_replies_planned += 1
            if typ in ("post", "answer", "page_post", "short_script") and cta:
                cta_posts_planned += 1
        if st == "pending":
            if is_engage or typ == "reply":
                replies_pending += 1
            if typ in ("post", "answer", "page_post", "short_script"):
                posts_pending += 1

    # Planned includes done+pending with cta flag for engage
    cta_replies_total = sum(
        1
        for r in rows
        if (r.get("type") or "").lower() in ENGAGE_TYPES | {"reply"}
        and (r.get("cta") or "") == "1"
    )
    cta_posts_total = sum(
        1
        for r in rows
        if (r.get("type") or "").lower() in ("post", "answer", "page_post", "short_script")
        and (r.get("cta") or "") == "1"
    )

    return {
        "replies_done": replies_done,
        "posts_done": posts_done,
        "high_intent_done": high_intent_done,
        "followups_waiting": followups_waiting,
        "followups_completed": followups_completed,
        "replies_pending": replies_pending,
        "posts_pending": posts_pending,
        "cta_replies_planned": cta_replies_planned,
        "cta_replies_done": cta_replies_done,
        "cta_replies_total": cta_replies_total,
        "cta_posts_planned": cta_posts_planned,
        "cta_posts_done": cta_posts_done,
        "cta_posts_total": cta_posts_total,
        "cta_engage_share_target": int(CTA_ENGAGE_SHARE * 100),
    }


def kpi_strip(counts: dict[str, int] | None = None) -> str:
    c = counts or kpi_counts()
    return (
        f"Replies {c['replies_done']}/{KPI_REPLIES} · "
        f"Posts {c['posts_done']}/{KPI_POSTS} · "
        f"High-intent {c['high_intent_done']}/{KPI_HIGH_INTENT} · "
        f"CTA replies {c['cta_replies_done']}/{c['cta_replies_total']} · "
        f"CTA posts {c['cta_posts_done']}/{c['cta_posts_total']} · "
        f"Follow-ups waiting {c['followups_waiting']} · "
        f"Follow-ups done {c['followups_completed']}"
    )


def write_scorecard(*, notes: str = "") -> Path:
    ensure_output_dirs()
    c = kpi_counts()
    path = THIS_WEEK / "_meta" / "scorecard.md"
    default_notes = (
        "- Quora / YouTube / X UTM clicks:\n"
        "- Bio / profile link clicks (IG/TikTok/LI Website):\n"
        "- GSC branded queries (ieltsgrader / IELTS AI Tutor) — from branded channels:\n"
        "- Free evaluations attributed:\n"
        "- LinkedIn comment blocks this week (if any):\n"
        "- Expected Reddit+LinkedIn CTA engage drafts: 0\n"
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
| Soft-CTA replies (site mention) | ~{c['cta_engage_share_target']}% of engages | {c['cta_replies_done']} / {c['cta_replies_total']} planned |
| Create actions with CTA | Most non-Reddit-value | {c['cta_posts_done']} / {c['cta_posts_total']} |
| Bio / profile link clicks | Track in Insights | (fill below) |
| Free evaluations from social | Track UTMs | (fill below) |

## Notes (you fill)
{notes_block}

## Pending still open
- Replies pending: {c['replies_pending']}
- Posts pending: {c['posts_pending']}
- Follow-ups waiting: {c['followups_waiting']}
- Follow-ups completed: {c['followups_completed']}

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
            "followups_completed",
            "cta_replies_done",
            "cta_replies_total",
            "cta_posts_done",
            "cta_posts_total",
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
                "followups_completed": c["followups_completed"],
                "cta_replies_done": c["cta_replies_done"],
                "cta_replies_total": c["cta_replies_total"],
                "cta_posts_done": c["cta_posts_done"],
                "cta_posts_total": c["cta_posts_total"],
            }
        )
