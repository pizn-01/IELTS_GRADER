"""
Weekly create pack — playbook §3 cadence as paste-ready actions + schedule CSV.
"""

from __future__ import annotations

import csv
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:  # Python < 3.9
    ZoneInfo = None  # type: ignore

from agent_io import (
    THIS_WEEK,
    format_action_id,
    next_action_id,
    upsert_status_rows,
)
from agent_rules import (
    CREATE_SHORT_DAYS,
    CREATE_TARGETS,
    DISCLOSURE,
    HASHTAG_DEFAULT,
    HOOKS,
    BRAND_BLUE,
    BRAND_NAVY,
    SOFT_CTA,
    agent_tz,
    strip_brand_from_text,
    system_prompt_create,
    utm_url,
    validate_draft,
    SITE,
)
from llm_client import llm_complete
from draft_replies import write_action_markdown


def _tzinfo():
    name = agent_tz()
    if ZoneInfo is not None:
        try:
            return ZoneInfo(name)
        except Exception:
            pass
    # Fallback: treat as US Eastern-ish fixed -5
    return timezone(timedelta(hours=-5))


def _next_weekday(start: date, weekday: int) -> date:
    days_ahead = (weekday - start.weekday()) % 7
    return start + timedelta(days=days_ahead)


def _day_to_index(label: str) -> int:
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].index(label)


def load_theme_bank() -> dict[str, Any]:
    candidates = [
        THIS_WEEK / "_meta" / "theme_bank.json",
        THIS_WEEK.parent / "queue" / "cold-start" / "_meta" / "theme_bank.json",
        THIS_WEEK.parent / "cold-start" / "_meta" / "theme_bank.json",
    ]
    for path in candidates:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
    return {
        "themes": [
            "Band 6 vs 7 Task Response",
            "Task 1 trend verbs",
            "GT letter tone",
        ]
    }


def draft_content_pack(
    *,
    dry_run: bool = False,
    week_start: Optional[date] = None,
    week_id: str = "",
) -> list[dict[str, str]]:
    week_start = week_start or date.today()
    wid = week_id or week_start.isoformat()
    queued_at = datetime.now(timezone.utc).isoformat()
    themes = load_theme_bank().get("themes") or HOOKS
    n = next_action_id()
    status_rows: list[dict[str, str]] = []
    schedule_rows: list[dict[str, str]] = []
    tz = _tzinfo()

    def status_row(*args, **kwargs):
        return _make_status(*args, **kwargs, week_id=wid, queued_at=queued_at)

    short_count = CREATE_TARGETS.get("youtube", 4)
    short_days = list(CREATE_SHORT_DAYS)[:short_count]

    for i in range(short_count):
        day = short_days[i % len(short_days)]
        theme = themes[i % len(themes)]
        script = llm_complete(
            system_prompt_create("youtube", "short_script"),
            f"Write Short #{i+1} script (45–60s) on: {theme}. "
            "Include on-screen essay line cues and spoken soft CTA.",
            dry_run=dry_run,
        )
        aid = format_action_id(n)
        n += 1
        path = write_action_markdown(
            aid=aid,
            platform="youtube",
            typ="short_script",
            day=day,
            url=SITE,
            title=f"Short script: {theme}",
            paste=script
            + f"\n\n[Visual] 9:16 · overlays {BRAND_NAVY} / {BRAND_BLUE} · burn-in captions",
            followup="Pin comment: Get full criterion feedback free — link below.\n"
            + DISCLOSURE,
            placement="description + pinned comment",
            disclosure_needed=True,
            issues=validate_draft(script, product_mentioned=True),
            intent="create",
        )
        status_rows.append(
            status_row(aid, day, "youtube", "short_script", f"Short: {theme}", path)
        )
        sched_at = _schedule_dt(week_start, day, 10 + i, tz)
        schedule_rows.append(
            _sched(aid, "youtube", "short_script", theme, script[:500], sched_at)
        )

        for plat in ("tiktok", "instagram"):
            caption = llm_complete(
                system_prompt_create(plat, "caption"),
                f"Rewrite as a {plat} caption for this Short. Say link in bio. "
                f"Tags 3-8.\n\n{script}",
                dry_run=dry_run,
            )
            tags = " ".join(HASHTAG_DEFAULT[:5])
            if tags not in caption:
                caption = f"{caption.rstrip()}\n\n{tags}"
            caid = format_action_id(n)
            n += 1
            cpath = write_action_markdown(
                aid=caid,
                platform=plat,
                typ="caption",
                day=day,
                url=SITE,
                title=f"{plat} caption: {theme}",
                paste=caption,
                followup="Pinned comment: free essay check — link in bio.\n" + DISCLOSURE,
                placement="link in bio + pinned comment",
                disclosure_needed=True,
                issues=validate_draft(caption, product_mentioned=True),
                intent="create",
            )
            status_rows.append(
                status_row(caid, day, plat, "caption", f"{plat}: {theme}", cpath)
            )
            schedule_rows.append(
                _sched(caid, plat, "caption", theme, caption[:500], sched_at)
            )

        if i == 0:
            said = format_action_id(n)
            n += 1
            spath = write_action_markdown(
                aid=said,
                platform="instagram",
                typ="stories",
                day=day,
                url=SITE,
                title="Stories poll",
                paste=(
                    "Poll sticker: Band 6 or 7 intro?\n"
                    "Slide tip: Topic sentence must preview the whole paragraph."
                ),
                followup="",
                placement="link sticker if eligible / bio",
                disclosure_needed=False,
                issues=[],
                intent="create",
            )
            status_rows.append(
                status_row(said, day, "instagram", "stories", "Stories poll", spath)
            )

    # Reddit value post — Wed
    raid = format_action_id(n)
    n += 1
    rbody = llm_complete(
        system_prompt_create("reddit", "value_post"),
        "Write 1 Reddit value post (title + body). No link dump. "
        "End by offering to look at one paragraph. Theme: Band 6 vs 7 Task Response.",
        dry_run=dry_run,
    )
    rpath = write_action_markdown(
        aid=raid,
        platform="reddit",
        typ="post",
        day="Wed",
        url="https://www.reddit.com/r/IELTS/",
        title="Reddit value post",
        paste=rbody,
        followup="Reply to commenters with one concrete tip; no product unless asked.",
        placement="none — value post",
        disclosure_needed=False,
        issues=validate_draft(rbody, product_mentioned=False),
        intent="create",
    )
    status_rows.append(
        status_row(raid, "Wed", "reddit", "post", "Reddit value post", rpath, cta=False)
    )

    quora_qs = [
        "How can I check my IELTS essay?",
        "What should I look for in IELTS writing feedback tools?",
        "How do I improve from Band 6.5 to 7 in Task 2?",
        "Is AI feedback useful for IELTS Writing?",
    ]
    for i, q in enumerate(quora_qs[: CREATE_TARGETS.get("quora", 4)]):
        day = ["Tue", "Wed", "Thu", "Fri"][i % 4]
        qaid = format_action_id(n)
        n += 1
        ans = llm_complete(
            system_prompt_create("quora", "answer"),
            f"Write a 300-800 word Quora-style answer to: {q}. "
            "Answer first; product last with disclosure only if tool-relevant.",
            dry_run=dry_run,
        )
        if "ieltsgrader" not in ans.lower():
            ans = (
                f"{ans.rstrip()}\n\n{DISCLOSURE}\n{SOFT_CTA}\n"
                f"{utm_url(SITE, 'quora')}"
            )
        qpath = write_action_markdown(
            aid=qaid,
            platform="quora",
            typ="answer",
            day=day,
            url="https://www.quora.com/",
            title=q,
            paste=ans,
            followup="Reply with one extra example; keep disclosure if product mentioned.",
            placement="end of answer + disclosure",
            disclosure_needed=True,
            issues=validate_draft(ans, product_mentioned=True),
            intent="create",
        )
        status_rows.append(status_row(qaid, day, "quora", "answer", q, qpath, cta=True))
        schedule_rows.append(
            _sched(
                qaid,
                "quora",
                "answer",
                q,
                ans[:500],
                _schedule_dt(week_start, day, 14, tz),
            )
        )

    for i in range(CREATE_TARGETS.get("twitter", 5)):
        day = ["Tue", "Wed", "Thu", "Fri", "Tue"][i]
        taid = format_action_id(n)
        n += 1
        tw = llm_complete(
            system_prompt_create("twitter", "post"),
            f"Write X/Twitter post #{i+1}: one tip + example. "
            f"Theme: {themes[i % len(themes)]}. Bio link default.",
            dry_run=dry_run,
        )
        tpath = write_action_markdown(
            aid=taid,
            platform="twitter",
            typ="post",
            day=day,
            url="https://x.com/",
            title=f"X post {i+1}",
            paste=tw,
            followup="Reply to comments with a mini tip.",
            placement="bio link default",
            disclosure_needed=False,
            issues=validate_draft(tw, product_mentioned="ieltsgrader" in tw.lower()),
            intent="create",
        )
        status_rows.append(status_row(taid, day, "twitter", "post", f"X post {i+1}", tpath))
        schedule_rows.append(
            _sched(
                taid,
                "twitter",
                "post",
                f"X {i+1}",
                tw[:500],
                _schedule_dt(week_start, day, 11, tz),
            )
        )

    for i in range(CREATE_TARGETS.get("linkedin", 2)):
        day = ["Tue", "Thu"][i % 2]
        laid = format_action_id(n)
        n += 1
        if i == 0:
            li = llm_complete(
                system_prompt_create("linkedin", "education_post"),
                "120-250 word LinkedIn post: one concrete IELTS Writing teaching "
                "point (criteria or structure). Pure education — no URL, no "
                "disclosure, no product name.",
                dry_run=dry_run,
            )
            # Strip any accidental promo
            li = strip_brand_from_text(li)
            disclosure_needed = False
            product_mentioned = False
            placement = "none — education only"
        else:
            li = llm_complete(
                system_prompt_create("linkedin", "profile_cta_post"),
                "120-250 word LinkedIn post: what good IELTS writing feedback "
                "should include. Soft CTA that says to visit the Website/Featured "
                "link on your profile — do NOT paste ieltsgrader.com or any raw URL.",
                dry_run=dry_run,
            )
            # Ensure no raw site URL in body
            li = re.sub(r"(?i)https?://\S*ieltsgrader\.com\S*", "", li)
            li = re.sub(r"(?i)\bieltsgrader\.com\b", "the link in my profile", li)
            if "profile" not in li.lower() and "featured" not in li.lower():
                li = (
                    f"{li.rstrip()}\n\n"
                    "If useful, the free writing check is linked on my profile "
                    "(Website / Featured) — no pressure."
                )
            disclosure_needed = False
            product_mentioned = "ielts" in li.lower() and (
                "profile" in li.lower() or "tutor" in li.lower()
            )
            placement = "profile Website/Featured only — no raw URL in post"
        lpath = write_action_markdown(
            aid=laid,
            platform="linkedin",
            typ="post",
            day=day,
            url="https://www.linkedin.com/",
            title=f"LinkedIn post {i+1}",
            paste=li,
            followup="",
            placement=placement,
            disclosure_needed=disclosure_needed,
            issues=validate_draft(li, product_mentioned=False),
            intent="create",
        )
        status_rows.append(
            status_row(
                laid,
                day,
                "linkedin",
                "post",
                f"LinkedIn {i+1}",
                lpath,
                cta=i == 1,
            )
        )
        schedule_rows.append(
            _sched(
                laid,
                "linkedin",
                "post",
                f"LI {i+1}",
                li[:500],
                _schedule_dt(week_start, day, 12, tz),
            )
        )

    for i in range(CREATE_TARGETS.get("facebook", 2)):
        day = ["Tue", "Thu"][i % 2]
        faid = format_action_id(n)
        n += 1
        fb = llm_complete(
            system_prompt_create("facebook", "page_post"),
            "Facebook Page post: short IELTS writing tip for GT / study-abroad parents.",
            dry_run=dry_run,
        )
        fpath = write_action_markdown(
            aid=faid,
            platform="facebook",
            typ="page_post",
            day=day,
            url="https://www.facebook.com/",
            title=f"FB page post {i+1}",
            paste=fb,
            followup="",
            placement="About / allowed comment + disclosure",
            disclosure_needed="ieltsgrader" in fb.lower(),
            issues=validate_draft(fb, product_mentioned="ieltsgrader" in fb.lower()),
            intent="create",
        )
        status_rows.append(
            status_row(faid, day, "facebook", "page_post", f"FB page {i+1}", fpath)
        )
        gaid = format_action_id(n)
        n += 1
        gbody = llm_complete(
            system_prompt_create("facebook", "group_comment"),
            "Helpful Facebook group comment on IELTS writing — NO link.",
            dry_run=dry_run,
        )
        gpath = write_action_markdown(
            aid=gaid,
            platform="facebook",
            typ="group_comment",
            day=day,
            url="https://www.facebook.com/groups/",
            title=f"FB group-safe comment {i+1}",
            paste=gbody,
            followup="",
            placement="none — help over links",
            disclosure_needed=False,
            issues=validate_draft(gbody, product_mentioned=False),
            intent="create",
        )
        status_rows.append(
            status_row(gaid, day, "facebook", "group_comment", f"FB group {i+1}", gpath)
        )

    upsert_status_rows(status_rows)
    _write_schedule_csv(schedule_rows)
    return status_rows


def _make_status(
    aid: str,
    day: str,
    platform: str,
    typ: str,
    title: str,
    path: Path,
    *,
    cta: bool = True,
    week_id: str = "",
    queued_at: str = "",
) -> dict[str, str]:
    return {
        "id": aid,
        "day": day,
        "status": "pending",
        "platform": platform,
        "type": typ,
        "url": SITE,
        "title": title[:160],
        "intent": "create",
        "high_intent": "0",
        "tier": "2",
        "action_file": str(path.relative_to(THIS_WEEK)),
        "fresh": "0",
        "cta": "1" if cta else "0",
        "reply_check": "",
        "week_id": week_id,
        "queued_at": queued_at,
        "parent_id": "",
    }


def _schedule_dt(week_start: date, day_label: str, hour: int, tz) -> str:
    target = _next_weekday(week_start, _day_to_index(day_label))
    dt = datetime(target.year, target.month, target.day, hour, 0, tzinfo=tz)
    return dt.isoformat()


def _sched(
    aid: str, platform: str, typ: str, title: str, text: str, when: str
) -> dict[str, str]:
    return {
        "id": aid,
        "platform": platform,
        "type": typ,
        "title": title,
        "text": text.replace("\n", " ")[:2000],
        "scheduled_at": when,
        "url": utm_url(SITE, platform, "organic_create"),
    }


def _write_schedule_csv(rows: list[dict[str, str]]) -> None:
    path = THIS_WEEK / "schedule_export.csv"
    fields = ["id", "platform", "type", "title", "text", "scheduled_at", "url"]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow(r)
