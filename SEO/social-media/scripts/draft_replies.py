"""
Draft paste-ready engage actions from triage items. Never auto-posts.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import requests

from agent_io import (
    THIS_WEEK,
    format_action_id,
    next_action_id,
    read_status,
    upsert_status_rows,
)
from agent_rules import (
    DISCLOSURE,
    SOFT_CTA,
    allow_product_mention,
    link_placement,
    platform_tier,
    system_prompt_engage,
    utm_url,
    validate_draft,
    warmup_enabled,
    SITE,
)
from common import USER_AGENT
from llm_client import llm_complete
from triage_threads import TriageItem


def fetch_reddit_context(url: str) -> str:
    """Best-effort public JSON for a reddit submission."""
    if "reddit.com" not in url:
        return ""
    json_url = url.rstrip("/") + ".json"
    try:
        resp = requests.get(
            json_url,
            headers={"User-Agent": USER_AGENT},
            timeout=30,
        )
        if resp.status_code != 200:
            return ""
        data = resp.json()
        post = data[0]["data"]["children"][0]["data"]
        title = post.get("title") or ""
        body = (post.get("selftext") or "")[:1500]
        return f"Title: {title}\n\nBody:\n{body}"
    except Exception:
        return ""


def _action_filename(aid: str, platform: str, typ: str, day: str) -> str:
    safe_p = re.sub(r"[^a-z0-9]+", "", platform.lower())[:12]
    safe_t = re.sub(r"[^a-z0-9]+", "", typ.lower())[:16]
    safe_d = day[:3]
    return f"{aid}_{safe_p}_{safe_t}_{safe_d}.md"


def write_action_markdown(
    *,
    aid: str,
    platform: str,
    typ: str,
    day: str,
    url: str,
    title: str,
    paste: str,
    followup: str,
    placement: str,
    disclosure_needed: bool,
    issues: list[str],
    intent: str = "",
) -> Path:
    actions_dir = THIS_WEEK / "actions"
    actions_dir.mkdir(parents=True, exist_ok=True)
    fname = _action_filename(aid, platform, typ, day)
    path = actions_dir / fname
    disc = "required" if disclosure_needed else "not needed"
    issue_block = ""
    if issues:
        issue_block = "\n## VALIDATOR FLAGS\n" + "\n".join(f"- {i}" for i in issues) + "\n"
    content = f"""# {aid} · {platform} · {typ} · {day} · PENDING
Open: {url}
Title: {title}
Intent: {intent}
Link placement: {placement}
Disclosure: {disc}
{issue_block}
## PASTE
{paste}

## IF THEY REPLY (follow-up paste)
{followup}
"""
    path.write_text(content, encoding="utf-8")
    return path


def draft_engage_items(
    items: list[TriageItem],
    *,
    dry_run: bool = False,
    start_id: Optional[int] = None,
) -> list[dict[str, str]]:
    """Create action files + status rows for engage triage items."""
    n = start_id or next_action_id()
    status_rows: list[dict[str, str]] = []

    for item in items:
        if item.action == "observe_only":
            continue
        aid = format_action_id(n)
        n += 1
        context = ""
        if item.platform == "reddit":
            context = fetch_reddit_context(item.url)

        product_ok = allow_product_mention(item.platform, item.intent)
        placement = link_placement(item.platform, item.intent)
        system = system_prompt_engage(item.platform, item.intent)
        user = (
            f"Thread URL: {item.url}\n"
            f"Title: {item.title}\n"
            f"Snippet: {item.snippet}\n"
            f"Extra context:\n{context or '(none)'}\n"
        )
        paste = llm_complete(system, user, dry_run=dry_run)

        if product_ok and "ieltsgrader" not in paste.lower():
            link = utm_url(SITE, item.platform)
            paste = (
                f"{paste.rstrip()}\n\n{DISCLOSURE}\n{SOFT_CTA}\n{link}"
            )

        issues = validate_draft(paste, product_mentioned=product_ok)
        # Strip banned if validator caught and we're in safe mode — flag only

        followup = llm_complete(
            system_prompt_engage(item.platform, "general_tip"),
            "Write a short follow-up if they reply thanking you or pasting a paragraph. No product unless they ask for a tool.",
            dry_run=dry_run,
        )

        path = write_action_markdown(
            aid=aid,
            platform=item.platform,
            typ="reply",
            day=item.day or "Tue",
            url=item.url,
            title=item.title[:120],
            paste=paste,
            followup=followup,
            placement=placement,
            disclosure_needed=product_ok,
            issues=issues,
            intent=item.intent,
        )

        status_rows.append(
            {
                "id": aid,
                "day": item.day or "Tue",
                "status": "pending",
                "platform": item.platform,
                "type": "reply",
                "url": item.url,
                "title": item.title[:160],
                "intent": item.intent,
                "high_intent": "1" if item.high_intent else "0",
                "tier": str(platform_tier(item.platform)),
                "action_file": str(path.relative_to(THIS_WEEK)),
                "fresh": "1" if item.fresh else "0",
            }
        )

    upsert_status_rows(status_rows)
    return status_rows
