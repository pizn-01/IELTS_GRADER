#!/usr/bin/env python3
"""Build free-time onboarding engage pack from historical CSV (separate from weekly).

New prepares use the same URL-context drafting path as weekly engages
(fetch_thread_context → thread-specific paste). To refresh existing pastes
without wiping STATUS, run redraft_open_engages.py (Admin: Redraft open replies)
instead of --reset.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import COLD_START, OUTPUT_DIR, ensure_output_dirs, write_status  # noqa: E402
from agent_rules import ONBOARDING_ENGAGE_TARGET  # noqa: E402
from draft_replies import draft_engage_items  # noqa: E402
from triage_threads import triage_csv, write_triage_json  # noqa: E402


def run(*, dry_run: bool = False, csv_path: Path | None = None, reset: bool = False) -> int:
    ensure_output_dirs()
    if csv_path is None:
        cands = sorted(OUTPUT_DIR.glob("ielts_social_historical_*.csv"))
        if not cands:
            print("No historical CSV. Run Cold start first.")
            return 1
        csv_path = cands[-1]

    print(f"Onboarding engage from {csv_path.name} (target {ONBOARDING_ENGAGE_TARGET}) …")
    if reset:
        write_status([], onboarding=True)
        actions = COLD_START / "actions"
        if actions.exists():
            for child in actions.iterdir():
                if child.is_file():
                    child.unlink()

    items = triage_csv(
        csv_path,
        mode="onboarding",
        target_engage=ONBOARDING_ENGAGE_TARGET,
        remember=True,
    )
    write_triage_json(COLD_START / "_meta" / "engage_queue.json", items)
    print(f"Onboarding candidates: {len(items)}")
    rows = draft_engage_items(
        items, dry_run=dry_run, onboarding=True, week_id="onboarding"
    )
    print(f"Onboarding engage actions ready: {len(rows)} → {COLD_START}")
    print("These are Free-time only — not counted in weekly Today / Pending.")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Prepare onboarding (cold-start) engage drafts")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--csv", type=Path)
    p.add_argument("--reset", action="store_true", help="Clear existing onboarding STATUS/actions")
    args = p.parse_args()
    return run(dry_run=args.dry_run, csv_path=args.csv, reset=args.reset)


if __name__ == "__main__":
    raise SystemExit(main())
