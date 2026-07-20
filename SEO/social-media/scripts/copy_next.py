#!/usr/bin/env python3
"""Copy next pending PASTE block to clipboard; print URL to open."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import (  # noqa: E402
    THIS_WEEK,
    copy_to_clipboard,
    extract_paste_block,
    pending_actions,
    sort_for_today,
)


def copy_next() -> int:
    rows = sort_for_today(pending_actions(include_overdue=True))
    # Prefer engage/followup over create for "next reply"
    prefer = [
        r
        for r in rows
        if r.get("type") in ("reply", "followup", "comment", "engage", "group_comment")
    ]
    pick = prefer[0] if prefer else (rows[0] if rows else None)
    if not pick:
        print("Nothing pending. Run menu 2 for today's list.")
        return 0
    rel = pick.get("action_file") or ""
    path = THIS_WEEK / rel
    if not path.exists():
        print(f"Missing action file: {path}")
        return 1
    paste, url = extract_paste_block(path)
    if not paste:
        print(f"No PASTE block in {path}")
        return 1
    ok = copy_to_clipboard(paste)
    print(f"Action `{pick.get('id')}` · {pick.get('platform')} · {pick.get('type')}")
    print(f"Open this URL:\n  {url or pick.get('url')}")
    if ok:
        print("Paste text is on your clipboard — paste into the platform, then menu 4 to mark done.")
    else:
        print("Could not access clipboard. Copy manually from:")
        print(f"  {path}")
        print("---")
        print(paste)
        print("---")
    return 0


def main() -> int:
    return copy_next()


if __name__ == "__main__":
    raise SystemExit(main())
