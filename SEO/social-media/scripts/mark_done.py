"""Mark actions done / awaiting_reply; update memory + scorecard."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import (  # noqa: E402
    THIS_WEEK,
    append_engaged,
    pending_actions,
    read_status,
    sort_for_today,
    write_status,
)
from scorecard import kpi_strip, write_scorecard  # noqa: E402


def mark(aid: str, *, awaiting_reply: bool = False, skipped: bool = False) -> None:
    rows = read_status()
    found = False
    for r in rows:
        if r.get("id") == aid.zfill(3) or r.get("id") == aid:
            found = True
            if skipped:
                r["status"] = "skipped"
            elif awaiting_reply:
                r["status"] = "awaiting_reply"
            else:
                r["status"] = "done"
            url = r.get("url") or ""
            if url and r["status"] in ("done", "skipped", "awaiting_reply"):
                append_engaged(url, r.get("platform") or "", r["status"])
            break
    if not found:
        raise SystemExit(f"No action with id {aid}. Check TODAY.md / STATUS.")
    write_status(rows)
    write_scorecard()
    print(f"Marked {aid} → {rows and next((x['status'] for x in rows if x.get('id') in (aid, aid.zfill(3))), '?')}")
    print(kpi_strip())


def interactive_mark() -> None:
    rows = sort_for_today(pending_actions(include_overdue=True))
    # also show awaiting for follow-up completion
    all_pending = [r for r in read_status() if r.get("status") in ("pending", "awaiting_reply")]
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
    wait = input("Wait for their reply later? [y/N]: ").strip().lower() == "y"
    skip = input("Skip instead of done? [y/N]: ").strip().lower() == "y"
    mark(row["id"], awaiting_reply=wait and not skip, skipped=skip)


def main() -> int:
    parser = argparse.ArgumentParser(description="Mark a social action done")
    parser.add_argument("--id", help="Action id like 014")
    parser.add_argument("--awaiting-reply", action="store_true")
    parser.add_argument("--skip", action="store_true")
    parser.add_argument("--interactive", action="store_true")
    args = parser.parse_args()
    if args.interactive or not args.id:
        interactive_mark()
    else:
        mark(args.id, awaiting_reply=args.awaiting_reply, skipped=args.skip)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
