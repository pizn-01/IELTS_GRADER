"""Draft follow-up actions for STATUS=awaiting_reply or got_reply."""

from __future__ import annotations

from pathlib import Path

from agent_io import (
    format_action_id,
    lookup_parent_id,
    next_action_id,
    read_status,
    upsert_status_rows,
    weekday_label,
    work_root,
    write_status,
)
from agent_rules import system_prompt_engage, validate_draft
from draft_replies import write_action_markdown
from llm_client import llm_complete


def extract_followup_from_file(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if "## IF THEY REPLY" in text:
        after = text.split("## IF THEY REPLY", 1)[1]
        block = after.split("\n# ")[0].strip()
        lines = block.splitlines()
        if lines and "follow-up" in lines[0].lower():
            lines = lines[1:]
        return "\n".join(lines).strip()
    return ""


def draft_followups(
    *, dry_run: bool = False, onboarding: bool = False
) -> list[dict[str, str]]:
    root = work_root(onboarding=onboarding)
    rows = read_status(onboarding=onboarding)
    existing_follow_urls = {
        r.get("url")
        for r in rows
        if r.get("type") == "followup" and r.get("status") == "pending"
    }
    new_rows: list[dict[str, str]] = []
    n = next_action_id(onboarding=onboarding)
    today = "Free" if onboarding else weekday_label()
    touched_parents = False

    for r in rows:
        if (r.get("status") or "") not in ("awaiting_reply", "got_reply"):
            continue
        url = r.get("url") or ""
        if url in existing_follow_urls:
            continue
        action_rel = r.get("action_file") or ""
        paste = ""
        if action_rel:
            ap = root / action_rel
            if ap.exists():
                paste = extract_followup_from_file(ap)
        if not paste:
            paste = llm_complete(
                system_prompt_engage(r.get("platform") or "reddit", "general_tip"),
                f"Follow-up on thread: {r.get('title')}. They may have replied. "
                "Be helpful; no product unless they ask for a tool.",
                dry_run=dry_run,
            )
        aid = format_action_id(n)
        n += 1
        path = write_action_markdown(
            aid=aid,
            platform=r.get("platform") or "reddit",
            typ="followup",
            day=today,
            url=url,
            title=f"Follow-up: {r.get('title') or ''}",
            paste=paste,
            followup="",
            placement="same as original thread rules",
            disclosure_needed=False,
            issues=validate_draft(paste, product_mentioned="ieltsgrader" in paste.lower()),
            intent="followup",
            onboarding=onboarding,
        )
        new_rows.append(
            {
                "id": aid,
                "day": today,
                "status": "pending",
                "platform": r.get("platform") or "",
                "type": "followup",
                "url": url,
                "title": f"Follow-up: {(r.get('title') or '')[:140]}",
                "intent": "followup",
                "high_intent": r.get("high_intent") or "0",
                "tier": r.get("tier") or "1",
                "action_file": str(path.relative_to(root)),
                "fresh": "0",
                "cta": "0",
                "reply_check": "",
                "week_id": r.get("week_id") or ("onboarding" if onboarding else ""),
                "queued_at": r.get("queued_at") or "",
                "parent_id": lookup_parent_id(url, onboarding=onboarding)
                or r.get("id")
                or "",
                "queue": "onboarding" if onboarding else "weekly",
            }
        )
        if r.get("status") == "got_reply":
            r["reply_check"] = "got_reply"
            r["status"] = "awaiting_reply"
            touched_parents = True
        existing_follow_urls.add(url)

    if touched_parents:
        write_status(rows, onboarding=onboarding)
    if new_rows:
        upsert_status_rows(new_rows, onboarding=onboarding)
    return new_rows
