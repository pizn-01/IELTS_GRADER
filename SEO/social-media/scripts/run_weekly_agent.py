#!/usr/bin/env python3
"""Monday pipeline: discover → triage → engage drafts → create pack → week brief."""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import (  # noqa: E402
    THIS_WEEK,
    archive_this_week_if_needed,
    ensure_output_dirs,
    write_status,
    write_week_meta,
)
from agent_rules import ENGAGE_TARGET, warmup_enabled  # noqa: E402
from briefs import write_week_brief  # noqa: E402
from common import (  # noqa: E402
    QUERY_BANK,
    collect_all_platforms,
    default_output_path,
    window_bounds,
    write_csv,
)
from draft_content_pack import draft_content_pack  # noqa: E402
from draft_replies import draft_engage_items  # noqa: E402
from open_brief import open_this_week  # noqa: E402
from triage_threads import triage_csv, write_triage_json  # noqa: E402


def run(*, dry_run: bool = False, skip_search: bool = False, csv_path: Path | None = None) -> int:
    ensure_output_dirs()
    today = date.today()
    week_id = today.isoformat()
    archive_this_week_if_needed(week_id)

    # Reset status for new week pack (fresh start)
    write_status([])
    # clear actions
    actions = THIS_WEEK / "actions"
    if actions.exists():
        shutil.rmtree(actions)
    actions.mkdir(parents=True, exist_ok=True)
    (THIS_WEEK / "_meta").mkdir(parents=True, exist_ok=True)

    if csv_path is None and not skip_search:
        start, end_dt = window_bounds(today, 7)
        print(f"Weekly discovery {start.date()} → {today} …")
        rows = collect_all_platforms(
            start=start,
            end=end_dt,
            queries=QUERY_BANK,
            dry_run=dry_run,
            serper_num=6,
            reddit_limit=35,
            youtube_max=12,
        )
        csv_path = default_output_path("ielts_social_weekly", today)
        write_csv(csv_path, rows)
        from collections import Counter

        by = dict(sorted(Counter((r.platform or "unknown").lower() for r in rows).items()))
        print(f"Wrote {len(rows)} discovery rows → {csv_path}")
        print(f"By platform: {by}", flush=True)
        (THIS_WEEK / "_meta" / "discovery_summary.json").write_text(
            __import__("json").dumps(
                {"rows": len(rows), "by_platform": by, "csv": str(csv_path)}, indent=2
            ),
            encoding="utf-8",
        )
    elif csv_path is None:
        # find latest weekly csv
        candidates = sorted(THIS_WEEK.parent.glob("ielts_social_weekly_*.csv"))
        if not candidates:
            print("No weekly CSV found. Run without --skip-search or pass --csv.")
            return 1
        csv_path = candidates[-1]
        print(f"Using existing CSV: {csv_path}")

    print("Triaging …")
    items = triage_csv(csv_path, mode="weekly", target_engage=ENGAGE_TARGET)
    write_triage_json(THIS_WEEK / "_meta" / "engage_queue.json", items)
    print(f"Engage candidates: {len(items)} (warmup={warmup_enabled()})")

    print("Drafting engage replies …")
    engage_rows = draft_engage_items(items, dry_run=dry_run)
    print(f"Engage actions: {len(engage_rows)}")

    print("Drafting create pack …")
    create_rows = draft_content_pack(dry_run=dry_run, week_start=today)
    print(f"Create actions: {len(create_rows)}")

    write_week_meta(
        {
            "week_id": week_id,
            "csv": str(csv_path),
            "generated_at": date.today().isoformat(),
            "warmup": warmup_enabled(),
        }
    )
    brief = write_week_brief()
    print(f"Week brief → {brief}")
    open_this_week()
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Monday Social Ops weekly agent")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-search", action="store_true")
    p.add_argument("--csv", type=Path)
    args = p.parse_args()
    return run(dry_run=args.dry_run, skip_search=args.skip_search, csv_path=args.csv)


if __name__ == "__main__":
    raise SystemExit(main())
