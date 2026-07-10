#!/usr/bin/env python3
"""Validate blog markdown frontmatter in src/content/blog."""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BLOG_DIRS = [
    REPO_ROOT / "ielts-grader-app" / "src" / "content" / "blog",
    REPO_ROOT / "SEO" / "blog",
]

REQUIRED = ["title", "slug", "description", "keyword", "status"]


def parse_frontmatter(text: str):
    if not text.startswith("---"):
        return None
    end = text.find("---", 3)
    if end == -1:
        return None
    data = {}
    for line in text[3:end].splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            data[key.strip()] = val.strip().strip('"')
    return data


def main():
    errors = []
    checked = 0

    for blog_dir in BLOG_DIRS:
        if not blog_dir.exists():
            continue
        for md in sorted(blog_dir.glob("*.md")):
            if md.name.startswith("_"):
                continue
            checked += 1
            fm = parse_frontmatter(md.read_text(encoding="utf-8"))
            if fm is None:
                errors.append(f"{md}: missing frontmatter")
                continue
            for field in REQUIRED:
                if field not in fm or not fm[field]:
                    errors.append(f"{md}: missing '{field}'")

    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        print(f"\n{len(errors)} error(s) in {checked} file(s)")
        return 1

    print(f"OK: {checked} blog file(s) validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
