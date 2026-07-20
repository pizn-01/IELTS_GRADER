"""Draft follow-up actions for STATUS=awaiting_reply."""

from __future__ import annotations

from agent_io import (
    THIS_WEEK,
    format_action_id,
    next_action_id,
    read_status,
    upsert_status_rows,
    weekday_label,
)
from agent_rules import system_prompt_engage, validate_draft
from draft_replies import write_action_markdown
from llm_client import llm_complete
from pathlib import Path


def extract_followup_from_file(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if "## IF THEY REPLY" in text:
        after = text.split("## IF THEY REPLY", 1)[1]
        # take until end or next unlikely
        block = after.split("\n# ")[0].strip()
        # remove heading remainder on first line
        lines = block.splitlines()
        if lines and "follow-up" in lines[0].lower():
            lines = lines[1:]
        return "\n".join(lines).strip()
    return ""


def draft_followups(*, dry_run: bool = False) -> list[dict[str, str]]:
    rows = read_status()
    existing_follow_urls = {
        r.get("url")
        for r in rows
        if r.get("type") == "followup" and r.get("status") == "pending"
    }
    new_rows: list[dict[str, str]] = []
    n = next_action_id()
    today = weekday_label()

    for r in rows:
        if (r.get("status") or "") != "awaiting_reply":
            continue
        url = r.get("url") or ""
        if url in existing_follow_urls:
            continue
        action_rel = r.get("action_file") or ""
        paste = ""
        if action_rel:
            ap = THIS_WEEK / action_rel
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
                "action_file": str(path.relative_to(THIS_WEEK)),
                "fresh": "0",
            }
        )
    if new_rows:
        upsert_status_rows(new_rows)
    return new_rows
