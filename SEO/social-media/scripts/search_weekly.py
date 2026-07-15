#!/usr/bin/env python3
"""
Weekly IELTS social listening — finds activity in the 7 days before the search date
across Facebook, Instagram, Reddit, Quora, Twitter/X, LinkedIn, TikTok, YouTube.

Designed for cron / launchd every Monday:

  cd SEO/social-media/scripts && python3 search_weekly.py

Usage:
  python3 search_weekly.py
  python3 search_weekly.py --date 2026-07-14
  python3 search_weekly.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    QUERY_BANK,
    collect_all_platforms,
    default_output_path,
    parse_date_arg,
    window_bounds,
    write_csv,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Weekly (prior 7 days) IELTS social discovery → CSV"
    )
    parser.add_argument(
        "--date",
        help="Search date YYYY-MM-DD (default: today). Looks at the prior 7 days.",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Lookback days inclusive ending on --date (default: 7)",
    )
    parser.add_argument(
        "--limit-queries",
        type=int,
        default=0,
        help="Use only the first N queries (0 = all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip API calls; write sample rows",
    )
    parser.add_argument(
        "--out",
        help="Output CSV path (optional)",
    )
    args = parser.parse_args()

    end = parse_date_arg(args.date)
    start, end_dt = window_bounds(end, args.days)

    queries = QUERY_BANK
    if args.limit_queries and args.limit_queries > 0:
        queries = QUERY_BANK[: args.limit_queries]

    print(
        f"Weekly search: {start.date()} → {end} "
        f"({len(queries)} queries, all 8 platforms)"
    )
    rows = collect_all_platforms(
        start=start,
        end=end_dt,
        queries=queries,
        dry_run=args.dry_run,
        serper_num=8,
        reddit_limit=40,
        youtube_max=15,
    )

    out = Path(args.out) if args.out else default_output_path(
        "ielts_social_weekly", end
    )
    write_csv(out, rows)
    print(f"Wrote {len(rows)} rows → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
