#!/usr/bin/env python3
"""Emit Social Ops status as JSON for the admin API bridge."""

from __future__ import annotations

import csv
import json
import os
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import (  # noqa: E402
    OUTPUT_DIR,
    THIS_WEEK,
    ensure_output_dirs,
    read_status,
    read_week_meta,
    weekday_label,
)
from agent_rules import (  # noqa: E402
    KPI_HIGH_INTENT,
    KPI_POSTS,
    KPI_REPLIES,
    PLAYBOOK_REMEMBER,
    warmup_enabled,
)
from scorecard import kpi_counts, kpi_strip  # noqa: E402


def _csv_discovery_stats(path: Path | None) -> dict | None:
    if not path or not path.exists():
        return None
    try:
        with path.open(newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    except OSError:
        return None
    by_platform = dict(
        sorted(Counter((r.get("platform") or "unknown").lower() for r in rows).items())
    )
    return {
        "file": path.name,
        "path": str(path),
        "rows": len(rows),
        "by_platform": by_platform,
    }


def _latest_csv(pattern: str) -> Path | None:
    cands = sorted(OUTPUT_DIR.glob(pattern))
    return cands[-1] if cands else None


def build_payload() -> dict:
    ensure_output_dirs()
    actions = read_status()
    kpi = kpi_counts(actions)
    cold = OUTPUT_DIR / "cold-start"
    serper = bool(os.getenv("SERPER_API_KEY", "").strip())
    openai_key = bool(os.getenv("OPENAI_API_KEY", "").strip())
    youtube = bool(os.getenv("YOUTUBE_API_KEY", "").strip())
    action_platforms = dict(
        sorted(
            Counter((a.get("platform") or "unknown").lower() for a in actions).items()
        )
    )
    engage_platforms = dict(
        sorted(
            Counter(
                (a.get("platform") or "unknown").lower()
                for a in actions
                if (a.get("type") or "").lower()
                in ("reply", "comment", "engage", "followup", "group_comment")
            ).items()
        )
    )
    create_platforms = dict(
        sorted(
            Counter(
                (a.get("platform") or "unknown").lower()
                for a in actions
                if (a.get("type") or "").lower()
                in ("post", "create", "short", "answer", "thread")
            ).items()
        )
    )
    historical = _csv_discovery_stats(_latest_csv("ielts_social_historical_*.csv"))
    weekly = _csv_discovery_stats(_latest_csv("ielts_social_weekly_*.csv"))
    return {
        "ok": True,
        "weekday": weekday_label(),
        "warmup": warmup_enabled(),
        "kpi": {
            **kpi,
            "targets": {
                "replies": KPI_REPLIES,
                "posts": KPI_POSTS,
                "high_intent": KPI_HIGH_INTENT,
            },
            "strip": kpi_strip(kpi),
        },
        "week_meta": read_week_meta(),
        "paths": {
            "this_week": str(THIS_WEEK),
            "has_status": (THIS_WEEK / "_meta" / "STATUS.csv").exists(),
            "has_today": (THIS_WEEK / "TODAY.md").exists(),
            "has_week_brief": (THIS_WEEK / "WEEK_BRIEF.md").exists(),
            "has_schedule": (THIS_WEEK / "schedule_export.csv").exists(),
            "has_scorecard": (THIS_WEEK / "_meta" / "scorecard.md").exists(),
            "has_backlog": (THIS_WEEK / "SUNDAY_BACKLOG.md").exists(),
            "has_onboarding": (cold / "ONBOARDING_BRIEF.md").exists(),
        },
        "discovery": {
            "historical": historical,
            "weekly": weekly,
        },
        "action_platforms": {
            "all": action_platforms,
            "engage": engage_platforms,
            "create": create_platforms,
        },
        "setup_ok": serper and openai_key,
        "actions": actions,
        "playbook_remember": PLAYBOOK_REMEMBER,
        "keys": {
            "SERPER_API_KEY": serper,
            "YOUTUBE_API_KEY": youtube,
            "OPENAI_API_KEY": openai_key,
        },
        "briefs_available": [
            k
            for k, p in [
                ("today", THIS_WEEK / "TODAY.md"),
                ("week", THIS_WEEK / "WEEK_BRIEF.md"),
                ("open", THIS_WEEK / "OPEN_ME.md"),
                ("scorecard", THIS_WEEK / "_meta" / "scorecard.md"),
                ("backlog", THIS_WEEK / "SUNDAY_BACKLOG.md"),
                ("onboarding", cold / "ONBOARDING_BRIEF.md"),
            ]
            if p.exists()
        ],
    }


def main() -> int:
    print(json.dumps(build_payload()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
