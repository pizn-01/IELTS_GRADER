#!/usr/bin/env python3
"""
Search IELTS grading / tutor related public posts over the last 5 years.

Writes a CSV under SEO/social-media/output/ with url, time, platform,
engagement (when available), and related fields.

Usage:
  python3 search_historical.py
  python3 search_historical.py --date 2026-07-14
  python3 search_historical.py --dry-run
  python3 search_historical.py --limit-queries 3
"""

from __future__ import annotations

import argparse
import sys
from datetime import timedelta
from pathlib import Path

# Allow running from scripts/ directory
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
        description="Historical (5-year) IELTS social discovery → CSV"
    )
    parser.add_argument(
        "--date",
        help="End date YYYY-MM-DD (default: today). Window = 5 years ending this day.",
    )
    parser.add_argument(
        "--years",
        type=int,
        default=5,
        help="Lookback window in years (default: 5)",
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
    # ~365.25 * years ≈ days
    days = int(args.years * 365.25)
    start, end_dt = window_bounds(end, days)
    # window_bounds treats days as inclusive calendar days; for multi-year
    # recalculate start from years for clarity
    start_alt = end_dt - timedelta(days=days)
    start = start_alt

    queries = QUERY_BANK
    if args.limit_queries and args.limit_queries > 0:
        queries = QUERY_BANK[: args.limit_queries]

    print(
        f"Historical search: {start.date()} → {end} "
        f"({len(queries)} queries, all platforms)"
    )
    rows = collect_all_platforms(
        start=start,
        end=end_dt,
        queries=queries,
        dry_run=args.dry_run,
        serper_num=10,
        reddit_limit=50,
        youtube_max=20,
    )

    out = Path(args.out) if args.out else default_output_path(
        "ielts_social_historical", end
    )
    write_csv(out, rows)
    print(f"Wrote {len(rows)} rows → {out}")
    high = [r for r in rows if r.sort_key() >= 100]
    print(f"Rows with engagement_score ≥ 100: {len(high)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
