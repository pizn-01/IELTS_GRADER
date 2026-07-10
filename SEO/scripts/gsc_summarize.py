#!/usr/bin/env python3
"""Summarize Google Search Console CSV export (Pages or Queries)."""

import csv
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 gsc_summarize.py <gsc-export.csv>")
        print("\nExport from GSC: Performance → Pages or Queries → Export")
        return 1

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        return 1

    rows = []
    with path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if not rows:
        print("No data in CSV")
        return 1

    # Normalize column names (GSC uses different headers)
    def get(row, *keys):
        for k in keys:
            if k in row and row[k]:
                return row[k]
        return ""

    parsed = []
    for row in rows:
        page = get(row, "Top pages", "Page", "Landing page")
        query = get(row, "Top queries", "Query")
        clicks = int(float(get(row, "Clicks") or 0))
        impressions = int(float(get(row, "Impressions") or 0))
        ctr = get(row, "CTR")
        position = get(row, "Position")
        label = page or query or "?"
        parsed.append({
            "label": label,
            "clicks": clicks,
            "impressions": impressions,
            "ctr": ctr,
            "position": position,
        })

    # Sort by impressions
    parsed.sort(key=lambda x: x["impressions"], reverse=True)

    print("=" * 70)
    print(f"GSC Summary — {path.name} ({len(parsed)} rows)")
    print("=" * 70)
    print(f"{'Label':<40} {'Impr':>8} {'Clicks':>7} {'CTR':>8} {'Pos':>6}")
    print("-" * 70)

    for item in parsed[:20]:
        label = item["label"][:38]
        print(
            f"{label:<40} {item['impressions']:>8} {item['clicks']:>7} "
            f"{str(item['ctr']):>8} {str(item['position']):>6}"
        )

    # Low CTR candidates
    low_ctr = [
        p for p in parsed
        if p["impressions"] >= 100 and p["clicks"] > 0
    ]
    print("\n--- Low-CTR rewrite candidates (impressions >= 100) ---")
    for item in low_ctr[:10]:
        print(f"  {item['label'][:50]} — {item['impressions']} impr, CTR {item['ctr']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
