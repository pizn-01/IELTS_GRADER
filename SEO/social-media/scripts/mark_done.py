"""Mark actions done / awaiting_reply / reply-check; update memory + scorecard."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import (  # noqa: E402
    append_engaged,
    read_status,
    sort_for_today,
    write_status,
)
from draft_followups import draft_followups  # noqa: E402
from scorecard import kpi_strip, write_scorecard  # noqa: E402


def mark(
    aid: str,
    *,
    awaiting_reply: bool = False,
    skipped: bool = False,
    got_reply: bool = False,
    still_waiting: bool = False,
    dead: bool = False,
    dry_run: bool = False,
) -> None:
    rows = read_status()
    found = False
    for r in rows:
        if r.get("id") == aid.zfill(3) or r.get("id") == aid:
            found = True
            r.setdefault("cta", "")
            r.setdefault("reply_check", "")
            if dead:
                r["status"] = "dead"
                r["reply_check"] = "dead"
            elif got_reply:
                r["status"] = "got_reply"
                r["reply_check"] = "got_reply"
            elif still_waiting:
                r["status"] = "awaiting_reply"
                r["reply_check"] = "still_waiting"
            elif skipped:
                r["status"] = "skipped"
            elif awaiting_reply:
                r["status"] = "awaiting_reply"
                r["reply_check"] = r.get("reply_check") or "waiting"
            else:
                r["status"] = "done"
            url = r.get("url") or ""
            if url and r["status"] in (
                "done",
                "skipped",
                "awaiting_reply",
                "got_reply",
                "dead",
            ):
                append_engaged(url, r.get("platform") or "", r["status"])
            break
    if not found:
        raise SystemExit(f"No action with id {aid}. Check TODAY.md / STATUS.")
    write_status(rows)
    if got_reply:
        try:
            fus = draft_followups(dry_run=dry_run)
            print(f"Follow-up drafts created/updated: {len(fus)}")
        except Exception as exc:  # noqa: BLE001
            print(f"Follow-up draft warning: {exc}")
    write_scorecard()
    print(
        f"Marked {aid} → "
        f"{next((x['status'] for x in rows if x.get('id') in (aid, aid.zfill(3))), '?')}"
    )
    print(kpi_strip())


def interactive_mark() -> None:
    all_pending = [
        r
        for r in read_status()
        if r.get("status") in ("pending", "awaiting_reply", "got_reply")
    ]
    all_pending = sort_for_today(all_pending)
    if not all_pending:
        print("Nothing pending. Nice work.")
        return
    print("\nPending actions:\n")
    for i, r in enumerate(all_pending, 1):
        print(
            f"  {i}. [{r.get('id')}] {r.get('platform')} {r.get('type')} — "
            f"{(r.get('title') or '')[:60]} ({r.get('status')}/{r.get('day')})"
        )
    choice = input("\nNumber to mark (or Enter to cancel): ").strip()
    if not choice:
        return
    try:
        idx = int(choice) - 1
        row = all_pending[idx]
    except (ValueError, IndexError):
        print("Invalid choice.")
        return
    print("a) Done  b) Wait reply  c) Got reply  d) Still waiting  e) Dead  f) Skip")
    mode = input("Choice [a]: ").strip().lower() or "a"
    mark(
        row["id"],
        awaiting_reply=mode == "b",
        got_reply=mode == "c",
        still_waiting=mode == "d",
        dead=mode == "e",
        skipped=mode == "f",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Mark a social action done")
    parser.add_argument("--id", help="Action id like 014")
    parser.add_argument("--awaiting-reply", action="store_true")
    parser.add_argument("--skip", action="store_true")
    parser.add_argument("--got-reply", action="store_true")
    parser.add_argument("--still-waiting", action="store_true")
    parser.add_argument("--dead", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--interactive", action="store_true")
    args = parser.parse_args()
    if args.interactive or not args.id:
        interactive_mark()
    else:
        mark(
            args.id,
            awaiting_reply=args.awaiting_reply,
            skipped=args.skip,
            got_reply=args.got_reply,
            still_waiting=args.still_waiting,
            dead=args.dead,
            dry_run=args.dry_run,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
