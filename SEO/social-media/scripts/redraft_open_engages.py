#!/usr/bin/env python3
"""
Force-regenerate PASTE text for open pending engage actions.

Uses the current thread-context drafting path. Does not rediscover URLs or
wipe STATUS — only overwrites action .md files for pending engage rows.
"""

from __future__ import annotations

import argparse
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import (  # noqa: E402
    ensure_output_dirs,
    is_parent_thread_type,
    read_status,
    update_status_action_file,
    work_root,
)
from draft_replies import DRAFT_WORKERS, _draft_one_item  # noqa: E402
from triage_threads import TriageItem  # noqa: E402

ENGAGE_TYPES = frozenset({"reply", "comment", "engage", "answer"})


def _pending_engage_rows(*, onboarding: bool) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for r in read_status(onboarding=onboarding):
        if (r.get("status") or "").lower() != "pending":
            continue
        typ = (r.get("type") or "").lower()
        if typ not in ENGAGE_TYPES and not is_parent_thread_type(typ):
            continue
        if typ not in ENGAGE_TYPES:
            continue
        if not (r.get("url") or "").strip():
            continue
        if not (r.get("id") or "").strip():
            continue
        rows.append(r)
    rows.sort(key=lambda r: r.get("id") or "")
    return rows


def _row_to_item(r: dict[str, str], *, onboarding: bool) -> TriageItem:
    intent = (r.get("intent") or "general_tip").strip() or "general_tip"
    return TriageItem(
        platform=(r.get("platform") or "unknown").lower(),
        url=(r.get("url") or "").strip(),
        title=r.get("title") or "",
        snippet="",
        engagement_score="",
        intent=intent,
        high_intent=(r.get("high_intent") or "") == "1",
        tier=int(r.get("tier") or "9"),
        score=0.0,
        day=r.get("day") or ("Free" if onboarding else "Tue"),
        action="soft_cta_ok" if (r.get("cta") or "") == "1" else "value_reply",
        fresh=(r.get("fresh") or "") == "1",
        cta_ok=(r.get("cta") or "") == "1" or intent == "tool_ask",
    )


def redraft_queue(
    *,
    onboarding: bool,
    dry_run: bool = False,
    max_workers: int = DRAFT_WORKERS,
    limit: int = 0,
) -> int:
    label = "onboarding" if onboarding else "weekly"
    rows = _pending_engage_rows(onboarding=onboarding)
    if limit and limit > 0:
        rows = rows[:limit]
    total = len(rows)
    if not total:
        print(f"No pending engage rows to redraft ({label}).", flush=True)
        return 0

    workers = max(1, min(max_workers, total))
    print(
        f"Redrafting {total} pending {label} engages with {workers} workers …",
        flush=True,
    )

    root = work_root(onboarding=onboarding)
    done = 0
    errors = 0
    lock = threading.Lock()

    def _one(r: dict[str, str]) -> None:
        aid = (r.get("id") or "").strip()
        item = _row_to_item(r, onboarding=onboarding)
        product_ok = (r.get("cta") or "") == "1"
        row = _draft_one_item(
            item,
            aid=aid,
            product_ok=product_ok,
            dry_run=dry_run,
            onboarding=onboarding,
            week_id=r.get("week_id") or ("onboarding" if onboarding else ""),
            queued_at=r.get("queued_at") or "",
            typ=(r.get("type") or "reply"),
        )
        rel = row.get("action_file") or ""
        if rel:
            update_status_action_file(aid, rel, onboarding=onboarding)
            # Remove stale action files for same id with different name
            old = (r.get("action_file") or "").strip()
            if old and old != rel:
                stale = root / old
                if stale.exists() and stale.is_file():
                    try:
                        stale.unlink()
                    except OSError:
                        pass

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_one, r): r for r in rows}
        for fut in as_completed(futures):
            r = futures[fut]
            try:
                fut.result()
            except Exception as exc:  # noqa: BLE001
                errors += 1
                print(
                    f"  Redraft failed id={r.get('id')} url={(r.get('url') or '')[:60]}: {exc}",
                    flush=True,
                )
            with lock:
                done += 1
                if done == total or done % 10 == 0:
                    print(f"Redrafted {done}/{total} ({label}) …", flush=True)

    print(
        f"Done {label}: {total - errors}/{total} ok"
        + (f", {errors} errors" if errors else ""),
        flush=True,
    )
    return total - errors


def run(
    *,
    queue: str = "both",
    dry_run: bool = False,
    max_workers: int = DRAFT_WORKERS,
    limit: int = 0,
) -> int:
    ensure_output_dirs()
    q = (queue or "both").lower().strip()
    if q not in ("weekly", "onboarding", "both"):
        print(f"Unknown queue: {queue} (use weekly|onboarding|both)")
        return 1
    n = 0
    if q in ("weekly", "both"):
        n += redraft_queue(
            onboarding=False, dry_run=dry_run, max_workers=max_workers, limit=limit
        )
    if q in ("onboarding", "both"):
        n += redraft_queue(
            onboarding=True, dry_run=dry_run, max_workers=max_workers, limit=limit
        )
    print(f"Redraft finished — {n} action files refreshed.", flush=True)
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description="Force-redraft open pending engage replies (URL-context aware)"
    )
    p.add_argument(
        "--queue",
        choices=("weekly", "onboarding", "both"),
        default="both",
        help="Which STATUS queue to refresh (default both)",
    )
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--workers", type=int, default=DRAFT_WORKERS)
    p.add_argument("--limit", type=int, default=0, help="Max rows per queue (0=all)")
    args = p.parse_args()
    return run(
        queue=args.queue,
        dry_run=args.dry_run,
        max_workers=args.workers,
        limit=args.limit,
    )


if __name__ == "__main__":
    raise SystemExit(main())
