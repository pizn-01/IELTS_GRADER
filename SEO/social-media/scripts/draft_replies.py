"""
Draft paste-ready engage actions from triage items. Never auto-posts.
"""

from __future__ import annotations

import json
import math
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import requests

from agent_io import (
    get_or_create_parent_id,
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
from common import (
    USER_AGENT,
    serper_scrape,
    serper_snippet_for_url,
    serper_snippets_for_reddit_post,
)
from llm_client import llm_complete
from triage_threads import TriageItem

DRAFT_WORKERS = 10


def _reddit_old_url(url: str) -> str:
    u = (url or "").strip()
    if "old.reddit.com" in u:
        return u
    return u.replace("www.reddit.com", "old.reddit.com").replace(
        "://reddit.com", "://old.reddit.com"
    )


def _reddit_oauth_post_body(url: str) -> str:
    """Fetch submission selftext via Reddit OAuth if client id/secret are set."""
    import os

    cid = (os.getenv("REDDIT_CLIENT_ID") or "").strip()
    sec = (os.getenv("REDDIT_CLIENT_SECRET") or "").strip()
    if not cid or not sec:
        return ""
    m = re.search(r"/comments/([a-z0-9]+)", url or "", re.I)
    if not m:
        return ""
    post_id = m.group(1)
    try:
        tok = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(cid, sec),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        if tok.status_code != 200:
            return ""
        access = (tok.json() or {}).get("access_token")
        if not access:
            return ""
        resp = requests.get(
            f"https://oauth.reddit.com/comments/{post_id}",
            headers={
                "Authorization": f"Bearer {access}",
                "User-Agent": USER_AGENT,
            },
            timeout=20,
        )
        if resp.status_code != 200:
            return ""
        post = resp.json()[0]["data"]["children"][0]["data"]
        title = post.get("title") or ""
        body = (post.get("selftext") or "")[:4000]
        if not body.strip():
            return ""
        return f"Title: {title}\n\nBody:\n{body}"
    except Exception:
        return ""


def fetch_reddit_context(url: str) -> str:
    """Best-effort Reddit OP text. Public JSON is often 403 from cloud — Serper scrape fallback."""
    return fetch_thread_context(url, "reddit")[0]


def fetch_thread_context(url: str, platform: str) -> tuple[str, str]:
    """
    Return (context_text, source) for drafting.
    source: reddit_json | serper_scrape | serper_snippet | none

    Reddit public .json is usually 403 from cloud IPs — try it briefly, then
    Serper-scrape old.reddit.com (full OP prompt + essay). Avoid polluted SERP
    snippets that mix other posts' text into this URL.
    """
    platform = (platform or "").lower()
    url = (url or "").strip()
    if not url:
        return "", "none"

    if "reddit.com" in url or platform == "reddit":
        # Prefer Serper scrape of old.reddit first (when not blocked).
        old = _reddit_old_url(url)
        scraped = serper_scrape(old, timeout=60)
        if scraped and len(scraped) > 80:
            return scraped[:5000], "serper_scrape"

        json_url = url.rstrip("/") + ".json"
        try:
            resp = requests.get(
                json_url,
                headers={"User-Agent": USER_AGENT},
                timeout=8,
            )
            if resp.status_code == 200:
                data = resp.json()
                post = data[0]["data"]["children"][0]["data"]
                title = post.get("title") or ""
                body = (post.get("selftext") or "")[:4000]
                if body.strip():
                    return f"Title: {title}\n\nBody:\n{body}", "reddit_json"
        except Exception:
            pass

        # Reddit OAuth if configured (cloud IPs need this for .json)
        oauth_body = _reddit_oauth_post_body(url)
        if oauth_body:
            return oauth_body, "reddit_oauth"

        # Multi-query Serper enrichment for this post id (filters comment pollution)
        rich = serper_snippets_for_reddit_post(url)
        if rich and len(rich) > 40:
            return rich, "serper_reddit_enrich"

        post_id = ""
        m = re.search(r"/comments/([a-z0-9]+)", url, re.I)
        if m:
            post_id = m.group(1).lower()
        snip = serper_snippet_for_url(url, require_substr=post_id or None)
        if snip and len(snip) > 40:
            return f"Search snippet:\n{snip}", "serper_snippet"
        return "", "none"

    scraped = serper_scrape(url, timeout=60)
    if scraped and len(scraped) > 80:
        return scraped[:5000], "serper_scrape"
    snip = serper_snippet_for_url(url)
    if snip:
        return f"Search snippet:\n{snip}", "serper_snippet"
    return "", "none"


def _looks_like_essay_request(title: str, snippet: str, context: str) -> bool:
    blob = f"{title}\n{snippet}\n{context}".lower()
    if any(
        p in blob
        for p in (
            "grade my",
            "check my essay",
            "evaluate my",
            "mark my",
            "please check my",
            "task 2",
            "writing task",
        )
    ):
        return True
    if "you should spend about 40 minutes" in blob or "you should write at least 250" in blob:
        return True
    if len(context) > 400 and ("answer" in blob or "nowadays" in blob):
        return True
    return False


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


def _write_draft_progress(
    *,
    onboarding: bool,
    total: int,
    done_urls: list[str],
    pending_urls: list[str],
) -> None:
    root = work_root(onboarding=onboarding)
    path = root / "_meta" / "draft_progress.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "total": total,
                "done": len(done_urls),
                "pending": len(pending_urls),
                "done_urls": done_urls,
                "pending_urls": pending_urls,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def _draft_one_item(
    item: TriageItem,
    *,
    aid: str,
    product_ok: bool,
    dry_run: bool,
    onboarding: bool,
    week_id: str,
    queued_at: str,
) -> dict[str, str]:
    """LLM draft + action file for one engage item (safe to run in a worker thread)."""
    root = work_root(onboarding=onboarding)
    context, ctx_source = fetch_thread_context(item.url, item.platform)
    essay_posted = _looks_like_essay_request(item.title, item.snippet, context)
    print(
        f"  [{aid}] context={ctx_source} chars={len(context)} essay_posted={essay_posted}",
        flush=True,
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
        f"Extra context (fetched from the URL — prefer this over Snippet):\n"
        f"{context or '(none — do not invent essay details)'}\n"
    )
    if essay_posted:
        user += (
            "\nOP already shared / asked to grade their essay. "
            "Reply to THEIR prompt/essay text above. "
            "Do NOT ask them to paste a paragraph.\n"
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

    issues = validate_draft(
        paste,
        product_mentioned=product_ok,
        already_posted_essay=essay_posted,
    )

    # One retry if validator caught generic/paste-ask failure and we have context
    if issues and context and not dry_run:
        retry_user = user + (
            "\nPrevious draft was too generic or asked them to paste. "
            "Rewrite: cite a concrete detail from Extra context "
            "(prompt topic or a line from their essay).\n"
        )
        paste2 = llm_complete(system, retry_user, dry_run=dry_run, temperature=0.85)
        if product_ok and "ieltsgrader" not in paste2.lower():
            link = utm_url(SITE, item.platform)
            paste2 = f"{paste2.rstrip()}\n\n{DISCLOSURE}\n{pick_soft_cta()}\n{link}"
        issues2 = validate_draft(
            paste2,
            product_mentioned=product_ok,
            already_posted_essay=essay_posted,
        )
        if len(issues2) <= len(issues):
            paste, issues = paste2, issues2

    followup = llm_complete(
        system_prompt_engage(item.platform, "general_tip"),
        "Write a short follow-up if they reply thanking you or asking a follow-up. "
        "Sound human. No product unless they ask for a tool. "
        "Do not ask them to paste an essay if they already posted one.",
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

    return {
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
        "week_id": week_id,
        "queued_at": queued_at,
        "parent_id": "",
    }


def draft_engage_items(
    items: list[TriageItem],
    *,
    dry_run: bool = False,
    start_id: Optional[int] = None,
    onboarding: bool = False,
    week_id: str = "",
    max_workers: int = DRAFT_WORKERS,
) -> list[dict[str, str]]:
    """
    Create action files + status rows for engage triage items (merge, never wipe).

    Pre-allocates IDs serially, then drafts with up to `max_workers` parallel LLM
    workers. Each completed draft is upserted into STATUS immediately so undrafted
    URLs remain only in engage_queue.json until finished.
    """
    from datetime import datetime, timezone

    cta_flags = _assign_cta_flags(items)
    queued_at = datetime.now(timezone.utc).isoformat()
    wid = week_id or ("onboarding" if onboarding else "")

    # Serial: pick new URLs and allocate unique ids (not yet in parent registry)
    batch_ids: dict[str, str] = {}
    work: list[tuple[TriageItem, str, bool]] = []  # item, aid, product_ok
    for item in items:
        if item.action == "observe_only":
            continue
        try:
            aid, is_new = get_or_create_parent_id(
                item.url, onboarding=onboarding, batch=batch_ids
            )
        except ValueError:
            continue
        if not is_new:
            # Parent URL already drafted / registered — skip
            continue
        use_cta = bool(cta_flags.get(normalize_key(item.url), False))
        product_ok = use_cta and allow_cta_for_item(
            item.platform,
            item.intent,
            cta_ok=item.cta_ok or item.intent == "tool_ask",
            force_cta=True,
        )
        work.append((item, aid, product_ok))

    total = len(work)
    pending_urls = [it.url for it, _, _ in work]
    done_urls: list[str] = []
    _write_draft_progress(
        onboarding=onboarding,
        total=total,
        done_urls=done_urls,
        pending_urls=pending_urls,
    )

    if not work:
        return []

    workers = max(1, min(max_workers, total))
    print(
        f"Drafting {total} engage replies with {workers} parallel workers …",
        flush=True,
    )

    status_rows: list[dict[str, str]] = []
    cta_count = 0
    progress_lock = threading.Lock()
    done_count = 0

    def _run(pair: tuple[TriageItem, str, bool]) -> dict[str, str]:
        item, aid, product_ok = pair
        return _draft_one_item(
            item,
            aid=aid,
            product_ok=product_ok,
            dry_run=dry_run,
            onboarding=onboarding,
            week_id=wid,
            queued_at=queued_at,
        )

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_run, pair): pair for pair in work}
        for fut in as_completed(futures):
            pair = futures[fut]
            item, _aid, product_ok = pair
            try:
                row = fut.result()
            except Exception as exc:  # noqa: BLE001
                print(
                    f"  Draft failed for {item.url[:80]}: {exc}",
                    flush=True,
                )
                continue

            # Immediate durable merge (STATUS lock lives in agent_io)
            upsert_status_rows([row], onboarding=onboarding)

            with progress_lock:
                status_rows.append(row)
                if row.get("cta") == "1":
                    cta_count += 1
                done_count += 1
                done_urls.append(item.url)
                pending_urls = [
                    u
                    for u in pending_urls
                    if normalize_key(u) != normalize_key(item.url)
                ]
                _write_draft_progress(
                    onboarding=onboarding,
                    total=total,
                    done_urls=list(done_urls),
                    pending_urls=list(pending_urls),
                )
                if done_count == total or done_count % 10 == 0:
                    print(f"Drafted {done_count}/{total} …", flush=True)

    if status_rows:
        label = "onboarding" if onboarding else "weekly"
        print(
            f"CTA {label} drafts: {cta_count}/{len(status_rows)} "
            f"(target ~{int(CTA_ENGAGE_SHARE * 100)}%)",
            flush=True,
        )
    return status_rows
