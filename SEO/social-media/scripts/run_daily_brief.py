#!/usr/bin/env python3
"""Tue–Fri daily brief: optional 24h fresh listen + follow-ups + TODAY.md."""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import THIS_WEEK, ensure_output_dirs, weekday_label  # noqa: E402
from agent_rules import FRESH_LISTEN_CAP, TIER1  # noqa: E402
from briefs import write_today_brief  # noqa: E402
from common import (  # noqa: E402
    QUERY_BANK,
    collect_all_platforms,
    window_bounds,
    write_csv,
)
from draft_followups import draft_followups  # noqa: E402
from draft_replies import draft_engage_items  # noqa: E402
from open_brief import open_this_week  # noqa: E402
from triage_threads import triage_csv, write_triage_json  # noqa: E402


def run(*, fresh: bool = True, dry_run: bool = False) -> int:
    ensure_output_dirs()
    if not (THIS_WEEK / "_meta" / "STATUS.csv").exists():
        print("No week pack yet. Use menu 1) Start / refresh my week first.")
        return 1

    day = weekday_label()
    # Default fresh on Tue–Fri
    if fresh is None:
        fresh = day in ("Tue", "Wed", "Thu", "Fri")

    if fresh and day in ("Tue", "Wed", "Thu", "Fri"):
        print("Fresh 24h listen (Tier-1 bias) …")
        today = date.today()
        start, end_dt = window_bounds(today, 1)
        queries = QUERY_BANK[:6]
        try:
            rows = collect_all_platforms(
                start=start,
                end=end_dt,
                queries=queries,
                platforms=list(TIER1) + ["youtube"],
                dry_run=dry_run,
                serper_num=5,
                reddit_limit=25,
                youtube_max=8,
            )
            csv_path = THIS_WEEK / "_meta" / f"fresh_{today.isoformat()}.csv"
            write_csv(csv_path, rows)
            items = triage_csv(
                csv_path, mode="weekly", fresh=True, fresh_cap=FRESH_LISTEN_CAP
            )
            write_triage_json(THIS_WEEK / "_meta" / "fresh_queue.json", items)
            drafted = draft_engage_items(items, dry_run=dry_run)
            print(f"Added {len(drafted)} fresh engage actions for {day}")
        except Exception as exc:  # noqa: BLE001
            print(f"Fresh listen skipped ({exc})")

    print("Follow-up drafts …")
    fus = draft_followups(dry_run=dry_run)
    print(f"Follow-ups ready: {len(fus)}")

    path = write_today_brief()
    print(f"TODAY → {path}")
    open_this_week("today")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Daily Social Ops brief")
    p.add_argument("--fresh", action="store_true", default=False)
    p.add_argument("--no-fresh", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    fresh = True
    if args.no_fresh:
        fresh = False
    elif args.fresh:
        fresh = True
    else:
        # default on for weekdays
        fresh = weekday_label() in ("Tue", "Wed", "Thu", "Fri")
    return run(fresh=fresh, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
