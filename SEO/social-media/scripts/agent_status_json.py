#!/usr/bin/env python3
"""Emit Social Ops status as JSON for the admin API bridge."""

from __future__ import annotations

import json
import sys
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


def _read_text(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def build_payload() -> dict:
    ensure_output_dirs()
    actions = read_status()
    kpi = kpi_counts(actions)
    cold = OUTPUT_DIR / "cold-start"
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
        "actions": actions,
        "playbook_remember": PLAYBOOK_REMEMBER,
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
