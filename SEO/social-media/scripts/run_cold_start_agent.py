#!/usr/bin/env python3
"""Cold start: historical discovery → onboarding brief + theme bank (learn, don't spam)."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import OUTPUT_DIR, ensure_output_dirs  # noqa: E402
from agent_rules import HOOKS, PLAYBOOK_REMEMBER  # noqa: E402
from common import (  # noqa: E402
    QUERY_BANK,
    QUERY_BANK_HISTORICAL_EXTRA,
    collect_all_platforms,
    default_output_path,
    write_csv,
)
from triage_threads import triage_csv, write_triage_json  # noqa: E402


def run(*, dry_run: bool = False, skip_search: bool = False, csv_path: Path | None = None) -> int:
    ensure_output_dirs()
    cold = OUTPUT_DIR / "cold-start"
    cold.mkdir(parents=True, exist_ok=True)
    meta = cold / "_meta"
    meta.mkdir(exist_ok=True)

    today = date.today()
    if csv_path is None and not skip_search:
        days = int(5 * 365.25)
        end = today
        end_dt = __import__("datetime").datetime.combine(
            end, __import__("datetime").datetime.max.time()
        ).replace(tzinfo=__import__("datetime").timezone.utc)
        start = end_dt - timedelta(days=days)
        print(f"Historical search {start.date()} → {end} …")
        queries = list(QUERY_BANK) + list(QUERY_BANK_HISTORICAL_EXTRA)
        rows = collect_all_platforms(
            start=start,
            end=end_dt,
            queries=queries,
            dry_run=dry_run,
            serper_num=10,
            reddit_limit=40,
            youtube_max=15,
            # Long window: undated first for Reddit/Quora (Google multi-year after: is weak)
            prefer_undated=True,
            allow_undated_fallback=True,
        )
        csv_path = default_output_path("ielts_social_historical", today)
        write_csv(csv_path, rows)
        by = Counter((r.platform or "unknown").lower() for r in rows)
        print(f"Wrote {len(rows)} rows → {csv_path}")
        print(f"By platform: {dict(sorted(by.items()))}", flush=True)
        (meta / "discovery_summary.json").write_text(
            json.dumps(
                {
                    "rows": len(rows),
                    "by_platform": dict(sorted(by.items())),
                    "csv": str(csv_path),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    elif csv_path is None:
        cands = sorted(OUTPUT_DIR.glob("ielts_social_historical_*.csv"))
        if not cands:
            print("No historical CSV. Run without --skip-search.")
            return 1
        csv_path = cands[-1]

    items = triage_csv(csv_path, mode="cold_start")
    write_triage_json(meta / "evergreen.json", items)

    # Free-time engage pack (separate STATUS — not weekly pending)
    print("Preparing onboarding engage drafts (free-time queue) …", flush=True)
    try:
        from prepare_onboarding_engages import run as prepare_onboarding

        prepare_onboarding(dry_run=dry_run, csv_path=csv_path, reset=True)
    except Exception as exc:  # noqa: BLE001
        print(f"Onboarding engage prepare warning: {exc}", flush=True)

    # Simple theme extraction from titles
    themes: list[str] = []
    words = Counter()
    for it in items[:30]:
        t = (it.title or "").lower()
        if "band 6" in t or "6.5" in t:
            themes.append("Band 6 vs 7 Task Response")
        if "task 1" in t:
            themes.append("Task 1 trend language")
        if "gt" in t or "letter" in t or "general training" in t:
            themes.append("GT letter tone")
        if "grade my" in t or "check my" in t:
            themes.append("How to get useful essay feedback")
        for w in t.split():
            if len(w) > 4:
                words[w] += 1
    themes = list(dict.fromkeys(themes)) or list(HOOKS)
    theme_bank = {"themes": themes[:12], "top_title_words": words.most_common(15)}
    (meta / "theme_bank.json").write_text(json.dumps(theme_bank, indent=2), encoding="utf-8")

    quora = [
        it for it in items if it.platform == "quora"
    ][:15]
    quora_md = ["# Quora question bank (from historical)", ""]
    for it in quora:
        quora_md.append(f"- {it.title}  \n  {it.url}")
    (cold / "quora_question_bank.md").write_text("\n".join(quora_md), encoding="utf-8")

    series = [
        "# Shorts series ideas",
        "",
        "1. Band 6 vs 7 week (Task Response)",
        "2. Task 1 verbs week",
        "3. GT tone week",
        "",
        "Themes from listening:",
        *[f"- {t}" for t in themes],
    ]
    (cold / "shorts_series_ideas.md").write_text("\n".join(series), encoding="utf-8")

    summary_path = meta / "discovery_summary.json"
    disc_rows = len(items)
    disc_by: dict = {}
    if summary_path.exists():
        try:
            disc = json.loads(summary_path.read_text(encoding="utf-8"))
            disc_rows = int(disc.get("rows") or disc_rows)
            disc_by = disc.get("by_platform") or {}
        except (json.JSONDecodeError, OSError, TypeError, ValueError):
            pass
    if not disc_by:
        disc_by = dict(Counter(it.platform for it in items))

    brief_lines = [
        "# ONBOARDING BRIEF (cold start)",
        "",
        "Cold start builds a **free-time engage queue** (Admin → Onboarding tab) "
        "plus themes for weekly create posts. Use Onboarding whenever you have spare "
        "time — it is **not** part of Today / Full week pending.",
        "",
        "## Discovery summary",
        f"- **{disc_rows}** listening rows found (themes from top evergreen)",
        "- By platform: "
        + (", ".join(f"{k}={v}" for k, v in sorted(disc_by.items())) or "n/a"),
        "",
        "## How replies / notifications work",
        "- Platforms do **not** notify this admin. After you paste, mark **Wait for reply**.",
        "- Later open **Awaiting replies**, check the thread, then **Got reply** / "
        "**Still waiting** / **Dead**.",
        "",
        "## Reddit + LinkedIn (permanent value-only)",
        "- Reddit comments: **never** product, brand, disclosure, or URLs (Rule 1 + 14).",
        "- Use a **neutral** Reddit username (not u/Ieltsgrader / IELTS+grader).",
        "- LinkedIn **comments**: same hard ban on links/disclosure (spam filter).",
        "- Soft CTAs only on Quora / X / YouTube. LinkedIn CTA = profile Website/Featured.",
        "- See `PLATFORM_GUIDELINES.pdf` and `SEO/guides/LINKEDIN.md`.",
        "- `SOCIAL_WARMUP=1` still applies to Facebook groups if needed.",
        "",
        "## Dual identity",
        "- Community: Reddit + LinkedIn person comments (neutral / real name).",
        "- Brand: YouTube, IG, TikTok, LinkedIn Company Page, site.",
        "",
        "## Themes to create about",
        *[f"- {t}" for t in themes],
        "",
        "## Sample evergreen threads",
    ]
    for it in items[:15]:
        brief_lines.append(
            f"- [{it.platform}] {it.title[:80]}  \n  score≈{it.score:.0f} · {it.url}"
        )
    brief_lines.extend(
        [
            "",
            f"See also: `quora_question_bank.md`, `shorts_series_ideas.md`.",
            "",
            PLAYBOOK_REMEMBER,
        ]
    )
    brief = cold / "ONBOARDING_BRIEF.md"
    brief.write_text("\n".join(brief_lines), encoding="utf-8")
    print(f"Onboarding brief → {brief}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Cold-start Social Ops agent")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--skip-search", action="store_true")
    p.add_argument("--csv", type=Path)
    args = p.parse_args()
    return run(dry_run=args.dry_run, skip_search=args.skip_search, csv_path=args.csv)


if __name__ == "__main__":
    raise SystemExit(main())
