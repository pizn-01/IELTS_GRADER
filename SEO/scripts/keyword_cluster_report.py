#!/usr/bin/env python3
"""Simple keyword cluster report from KEYWORDS.md (grep table rows)."""

import re
from pathlib import Path

KEYWORDS = Path(__file__).resolve().parent.parent / "KEYWORDS.md"


def main():
    if not KEYWORDS.exists():
        print("KEYWORDS.md not found")
        return 1

    text = KEYWORDS.read_text(encoding="utf-8")
    clusters = re.findall(r"^## (.+)$", text, re.MULTILINE)

    print("Keyword clusters in KEYWORDS.md:\n")
    for i, cluster in enumerate(clusters, 1):
        print(f"  {i}. {cluster}")

    # Count table rows with keywords
    rows = re.findall(r"^\| `?([^`|]+)`? \|", text, re.MULTILINE)
    print(f"\nTotal keyword/URL entries: {len(rows)}")
    print("\nTip: map each cluster to a pillar page and 2+ blog posts (see CONTENT_CALENDAR.md)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
