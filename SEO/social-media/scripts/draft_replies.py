"""
Draft paste-ready engage actions from triage items. Never auto-posts.
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Optional

import requests

from agent_io import (
    THIS_WEEK,
    format_action_id,
    next_action_id,
    upsert_status_rows,
    work_root,
)
from agent_rules import (
    CTA_ENGAGE_SHARE,
    DISCLOSURE,
    allow_cta_for_item,
    allow_product_mention,
    link_placement,
    pick_soft_cta,
    platform_tier,
    system_prompt_engage,
    utm_url,
    validate_draft,
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
    cta: bool = False,
    onboarding: bool = False,
) -> Path:
    root = work_root(onboarding=onboarding)
    actions_dir = root / "actions"
    actions_dir.mkdir(parents=True, exist_ok=True)
    fname = _action_filename(aid, platform, typ, day)
    path = actions_dir / fname
    disc = "required" if disclosure_needed else "not needed"
    issue_block = ""
    if issues:
        issue_block = "\n## VALIDATOR FLAGS\n" + "\n".join(f"- {i}" for i in issues) + "\n"
    queue = "ONBOARDING (free time)" if onboarding else "WEEK"
    content = f"""# {aid} · {platform} · {typ} · {day} · PENDING · {queue}
Open: {url}
Title: {title}
Intent: {intent}
CTA: {"yes" if cta else "no"}
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


def _assign_cta_flags(items: list[TriageItem]) -> dict[str, bool]:
    """Pick ~CTA_ENGAGE_SHARE of items for soft CTA (tool_ask first, then cta_ok feedback)."""
    eligible = [
        it
        for it in items
        if it.action != "observe_only"
        and allow_cta_for_item(it.platform, it.intent, cta_ok=it.cta_ok)
    ]
    # Prefer tool_ask, then feedback_ask with cta_ok, by score
    eligible.sort(
        key=lambda it: (
            0 if it.intent == "tool_ask" else 1,
            -it.score,
        )
    )
    draftable = [it for it in items if it.action != "observe_only"]
    target = max(
        1 if draftable else 0,
        min(len(eligible), math.ceil(len(draftable) * CTA_ENGAGE_SHARE)),
    )
    chosen = {normalize_key(it.url) for it in eligible[:target]}
    # Always include tool_ask when allowed (even if over share slightly)
    for it in draftable:
        if it.intent == "tool_ask" and allow_product_mention(it.platform, it.intent):
            chosen.add(normalize_key(it.url))
    return {normalize_key(it.url): normalize_key(it.url) in chosen for it in draftable}


def normalize_key(url: str) -> str:
    return (url or "").strip().lower().rstrip("/")


def draft_engage_items(
    items: list[TriageItem],
    *,
    dry_run: bool = False,
    start_id: Optional[int] = None,
    onboarding: bool = False,
    week_id: str = "",
) -> list[dict[str, str]]:
    """Create action files + status rows for engage triage items (merge, never wipe)."""
    from datetime import datetime, timezone

    root = work_root(onboarding=onboarding)
    n = start_id or next_action_id(onboarding=onboarding)
    status_rows: list[dict[str, str]] = []
    cta_flags = _assign_cta_flags(items)
    cta_count = 0
    queued_at = datetime.now(timezone.utc).isoformat()
    wid = week_id or ("onboarding" if onboarding else "")

    for item in items:
        if item.action == "observe_only":
            continue
        aid = format_action_id(n)
        n += 1
        context = ""
        if item.platform == "reddit":
            context = fetch_reddit_context(item.url)

        use_cta = bool(cta_flags.get(normalize_key(item.url), False))
        product_ok = use_cta and allow_cta_for_item(
            item.platform,
            item.intent,
            cta_ok=item.cta_ok or item.intent == "tool_ask",
            force_cta=True,
        )

        intent_for_prompt = item.intent
        if product_ok and item.intent == "feedback_ask":
            intent_for_prompt = "feedback_ask"
        elif product_ok:
            intent_for_prompt = "tool_ask"

        placement = link_placement(
            item.platform, intent_for_prompt if product_ok else "general_tip"
        )
        system = system_prompt_engage(
            item.platform, intent_for_prompt if product_ok else item.intent
        )
        user = (
            f"Thread URL: {item.url}\n"
            f"Title: {item.title}\n"
            f"Snippet: {item.snippet}\n"
            f"Extra context:\n{context or '(none)'}\n"
        )
        if product_ok:
            user += (
                "\nInclude a soft CTA to the free evaluation at ieltsgrader.com "
                "with disclosure — value first, one link max. Paraphrase; don't "
                "reuse the same CTA wording every time.\n"
            )
        else:
            user += "\nDo NOT mention any product or website — teach only.\n"

        paste = llm_complete(system, user, dry_run=dry_run, temperature=0.9)

        if product_ok and "ieltsgrader" not in paste.lower():
            link = utm_url(SITE, item.platform)
            paste = f"{paste.rstrip()}\n\n{DISCLOSURE}\n{pick_soft_cta()}\n{link}"
        if not product_ok and "ieltsgrader" in paste.lower():
            paste = re.sub(
                r"(?i)full disclosure:.*?ieltsgrader\.com\)?\s*",
                "",
                paste,
            )
            paste = re.sub(r"(?i)https?://\S*ieltsgrader\.com\S*", "", paste)
            paste = re.sub(r"\n{3,}", "\n\n", paste).strip()

        issues = validate_draft(paste, product_mentioned=product_ok)

        followup = llm_complete(
            system_prompt_engage(item.platform, "general_tip"),
            "Write a short follow-up if they reply thanking you or pasting a paragraph. "
            "Sound human. No product unless they ask for a tool.",
            dry_run=dry_run,
            temperature=0.9,
        )

        path = write_action_markdown(
            aid=aid,
            platform=item.platform,
            typ="reply",
            day=item.day or ("Free" if onboarding else "Tue"),
            url=item.url,
            title=item.title[:120],
            paste=paste,
            followup=followup,
            placement=placement,
            disclosure_needed=product_ok,
            issues=issues,
            intent=item.intent,
            cta=product_ok,
            onboarding=onboarding,
        )

        if product_ok:
            cta_count += 1

        status_rows.append(
            {
                "id": aid,
                "day": item.day or ("Free" if onboarding else "Tue"),
                "status": "pending",
                "platform": item.platform,
                "type": "reply",
                "url": item.url,
                "title": item.title[:160],
                "intent": item.intent,
                "high_intent": "1" if item.high_intent else "0",
                "tier": str(platform_tier(item.platform)),
                "action_file": str(path.relative_to(root)),
                "fresh": "1" if item.fresh else "0",
                "cta": "1" if product_ok else "0",
                "reply_check": "",
                "week_id": wid,
                "queued_at": queued_at,
            }
        )

    upsert_status_rows(status_rows, onboarding=onboarding)
    if status_rows:
        label = "onboarding" if onboarding else "weekly"
        print(
            f"CTA {label} drafts: {cta_count}/{len(status_rows)} "
            f"(target ~{int(CTA_ENGAGE_SHARE * 100)}%)",
            flush=True,
        )
    return status_rows
