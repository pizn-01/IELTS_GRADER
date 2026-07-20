#!/usr/bin/env python3
"""Monday pipeline: discover → filter → triage → engage drafts → create pack → week brief."""

from __future__ import annotations

import argparse
import json
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
from filter_candidates import filter_discovery_csv  # noqa: E402
from open_brief import open_this_week  # noqa: E402
from triage_threads import triage_csv, write_triage_json  # noqa: E402


def run(*, dry_run: bool = False, skip_search: bool = False, csv_path: Path | None = None) -> int:
    ensure_output_dirs()
    today = date.today()
    week_id = today.isoformat()
    archive_this_week_if_needed(week_id)

    write_status([])
    actions = THIS_WEEK / "actions"
    if actions.exists():
        shutil.rmtree(actions)
    actions.mkdir(parents=True, exist_ok=True)
    (THIS_WEEK / "_meta").mkdir(parents=True, exist_ok=True)

    if csv_path is None and not skip_search:
        start, end_dt = window_bounds(today, 7)
        print(f"Weekly discovery {start.date()} → {today} …", flush=True)
        rows = collect_all_platforms(
            start=start,
            end=end_dt,
            queries=QUERY_BANK,
            dry_run=dry_run,
            serper_num=6,
            reddit_limit=35,
            youtube_max=12,
            prefer_undated=False,
            # Weekly: undated only as last resort for thin Reddit/Quora SERPs
            allow_undated_fallback=True,
        )
        csv_path = default_output_path("ielts_social_weekly", today)
        write_csv(csv_path, rows)
        from collections import Counter

        by = dict(sorted(Counter((r.platform or "unknown").lower() for r in rows).items()))
        print(f"Wrote {len(rows)} discovery rows → {csv_path}", flush=True)
        print(f"By platform: {by}", flush=True)
        (THIS_WEEK / "_meta" / "discovery_summary.json").write_text(
            json.dumps(
                {"rows": len(rows), "by_platform": by, "csv": str(csv_path)}, indent=2
            ),
            encoding="utf-8",
        )
    elif csv_path is None:
        candidates = sorted(THIS_WEEK.parent.glob("ielts_social_weekly_*.csv"))
        if not candidates:
            print("No weekly CSV found. Run without --skip-search or pass --csv.")
            return 1
        csv_path = candidates[-1]
        print(f"Using existing CSV: {csv_path}")

    discovered_n = 0
    try:
        import csv as _csv

        with csv_path.open(newline="", encoding="utf-8") as f:
            discovered_n = sum(1 for _ in _csv.DictReader(f))
    except OSError:
        pass

    print("Filtering for relevance …", flush=True)
    filtered_csv, filter_summary = filter_discovery_csv(
        csv_path,
        out_csv=THIS_WEEK / "_meta" / "filtered_discovery.csv",
        meta_path=THIS_WEEK / "_meta" / "filter_summary.json",
        dry_run=dry_run,
        use_llm=not dry_run,
    )

    print("Triaging …", flush=True)
    items = triage_csv(
        filtered_csv,
        mode="weekly",
        target_engage=ENGAGE_TARGET,
        cta_map=filter_summary.get("cta_map") or {},
    )
    write_triage_json(THIS_WEEK / "_meta" / "engage_queue.json", items)
    print(f"Engage candidates: {len(items)} (warmup={warmup_enabled()})", flush=True)

    print("Drafting engage replies …", flush=True)
    engage_rows = draft_engage_items(items, dry_run=dry_run)
    print(f"Engage actions: {len(engage_rows)}", flush=True)

    print("Drafting create pack …", flush=True)
    create_rows = draft_content_pack(dry_run=dry_run, week_start=today)
    print(f"Create actions: {len(create_rows)}", flush=True)

    funnel = {
        "discovered": discovered_n or filter_summary.get("input_rows") or 0,
        "after_filter": filter_summary.get("passed") or 0,
        "engage_queue": len(engage_rows),
        "create": len(create_rows),
        "cta_engage": sum(1 for r in engage_rows if r.get("cta") == "1"),
        "cta_create": sum(1 for r in create_rows if r.get("cta") == "1"),
        "filter_rejected": filter_summary.get("rejected") or 0,
    }
    (THIS_WEEK / "_meta" / "funnel.json").write_text(
        json.dumps(funnel, indent=2), encoding="utf-8"
    )
    print(
        f"Funnel: discovered={funnel['discovered']} → filter={funnel['after_filter']} "
        f"→ engage={funnel['engage_queue']} + create={funnel['create']} "
        f"(CTA engage {funnel['cta_engage']}, create {funnel['cta_create']})",
        flush=True,
    )

    write_week_meta(
        {
            "week_id": week_id,
            "csv": str(csv_path),
            "filtered_csv": str(filtered_csv),
            "generated_at": date.today().isoformat(),
            "warmup": warmup_enabled(),
            "funnel": funnel,
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
