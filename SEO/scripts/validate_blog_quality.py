#!/usr/bin/env python3
"""Validate published blog posts against roadmap B2/B4 quality bar.

Hard structural checks apply to posts with publishedAt >= 2026-08-01 (Wave A era).
Older posts get warnings for structural gaps but must still carry quality frontmatter.

Usage:
  python3 SEO/scripts/validate_blog_quality.py
  python3 SEO/scripts/validate_blog_quality.py --strict
  python3 SEO/scripts/validate_blog_quality.py --slug improve-ielts-writing-band-7-to-8
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BLOG_DIR = REPO_ROOT / "ielts-grader-app" / "src" / "content" / "blog"
HARD_FROM = "2026-08-01"

LENGTH = {
    "qa": (800, 1200),
    "snippet": (800, 1200),
    "guide": (1500, 2200),
    "trust": (1500, 2500),
    "comparison": (1500, 2500),
    "sample": (1200, 1800),
    "pillar": (2000, 3000),
}


def parse_frontmatter(text: str) -> tuple[dict, str] | tuple[None, str]:
    if not text.startswith("---"):
        return None, text
    end = text.find("---", 3)
    if end == -1:
        return None, text
    data: dict[str, str] = {}
    for line in text[3:end].splitlines():
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        data[key.strip()] = val.strip().strip('"').strip("'")
    return data, text[end + 3 :].strip()


def word_count(body: str) -> int:
    body = re.sub(r"^# .+\n+", "", body.strip())
    return len(re.findall(r"\b[\w']+\b", body))


def lead_words(body: str) -> int:
    body = re.sub(r"^# .+\n+", "", body.strip())
    lead = body.split("\n\n")[0]
    return len(re.findall(r"\b[\w']+\b", lead))


def validate_post(path: Path, strict: bool) -> list[str]:
    errors: list[str] = []
    warnings: list[str] = []
    raw = path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)
    if fm is None:
        return [f"{path.name}: missing frontmatter"]

    if fm.get("status") != "published":
        return []

    label = path.name
    published = fm.get("publishedAt", "")
    hard = published >= HARD_FROM

    def fail(msg: str) -> None:
        (errors if hard else warnings).append(f"{label}: {msg}")

    def warn(msg: str) -> None:
        warnings.append(f"{label}: {msg}")

    for field in ("title", "slug", "description", "keyword", "type", "publishedAt", "author"):
        if not fm.get(field):
            errors.append(f"{label}: missing '{field}'")

    title = fm.get("title", "")
    desc = fm.get("description", "")
    typ = fm.get("type", "guide")

    if title and len(title) > 60:
        fail(f"title {len(title)} chars > 60")
    if desc and not (150 <= len(desc) <= 160):
        fail(f"description {len(desc)} chars (need 150–160)")

    words = word_count(body)
    lo, hi = LENGTH.get(typ, LENGTH["guide"])
    if typ == "guide" and words < 1300:
        lo, hi = LENGTH["qa"]
    if hard and not (lo <= words <= hi + 150):
        fail(f"word count {words} outside {lo}–{hi} for type={typ}")

    lead = lead_words(body)
    if hard and (typ in ("qa", "snippet") or (typ == "guide" and words < 1300)):
        if not (40 <= lead <= 55):
            fail(f"Q&A lead {lead} words (need 40–55)")

    if "Try this yourself" not in body and "Try it yourself" not in body:
        fail("missing 'Try this yourself' block")
    if "/ielts-essay-checker" not in body and "/ielts-task-1-checker" not in body and "/ielts-task-2-checker" not in body:
        fail("missing checker CTA")
    if "](/blog/" not in body:
        fail("missing related blog link")
    if "## Frequently asked questions" not in body:
        fail("missing FAQ section")

    if words > 1200:
        if "## In this guide" not in body and "## In this article" not in body:
            fail("posts >1200 words need TOC ('In this guide')")
        if hard and not re.search(r"\[.+\]\(#[\w-]+\)", body):
            fail("TOC needs jump-link anchors (#…)")

    # Quality frontmatter — required for all published
    serp = fm.get("serpNotes") or ""
    evidence = fm.get("evidenceNotes") or ""
    reviewed = (fm.get("qualityReviewed") or "pending").lower()

    if not serp:
        errors.append(f"{label}: missing serpNotes")
    elif "PENDING" in serp.upper() or "TBD" in serp.upper():
        msg = f"{label}: serpNotes still pending human recon"
        (errors if strict else warnings).append(msg)

    if not evidence:
        errors.append(f"{label}: missing evidenceNotes")
    elif "screenshot" in evidence.lower() and "pending" in evidence.lower():
        msg = f"{label}: evidence screenshots still pending"
        (errors if strict else warnings).append(msg)

    if reviewed not in ("ok", "pending"):
        errors.append(f"{label}: qualityReviewed must be 'pending' or 'ok'")
    elif reviewed != "ok":
        msg = f"{label}: qualityReviewed=pending (human skim required)"
        (errors if strict else warnings).append(msg)

    if not fm.get("updatedAt"):
        warn("missing updatedAt")

    return errors + [f"WARN: {w}" for w in warnings]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="Fail on pending SERP/evidence/review")
    ap.add_argument("--slug", help="Validate one slug only")
    args = ap.parse_args()

    if not BLOG_DIR.exists():
        print(f"ERROR: blog dir missing: {BLOG_DIR}", file=sys.stderr)
        return 1

    files = sorted(BLOG_DIR.glob("*.md"))
    if args.slug:
        files = [p for p in files if p.stem == args.slug]

    all_issues: list[str] = []
    checked = 0
    for path in files:
        if path.name.startswith("_"):
            continue
        fm, _ = parse_frontmatter(path.read_text(encoding="utf-8"))
        if not fm or fm.get("status") != "published":
            continue
        checked += 1
        all_issues.extend(validate_post(path, strict=args.strict))

    errors = [i for i in all_issues if not i.startswith("WARN:")]
    warns = [i for i in all_issues if i.startswith("WARN:")]

    for w in warns:
        print(w)
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)

    print(f"\nChecked {checked} published post(s): {len(errors)} error(s), {len(warns)} warning(s)")
    if not args.strict and any("pending" in w.lower() for w in warns):
        print("Tip: after your SERP/human review, re-run with --strict")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
