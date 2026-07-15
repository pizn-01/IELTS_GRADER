#!/usr/bin/env python3
"""Print SEO tracker progress from SEO/TRACKER.md."""

import re
from pathlib import Path

TRACKER = Path(__file__).resolve().parent.parent / "TRACKER.md"

STATUS_PATTERN = re.compile(
    r"^\| ([A-Z]+\d+) \| .+ \| .+ \| .+ \| (\w+) \|",
    re.MULTILINE,
)

PHASE_PATTERN = re.compile(r"^## Phase ([A-Z]+)", re.MULTILINE)


def main():
    if not TRACKER.exists():
        print(f"Tracker not found: {TRACKER}")
        return 1

    text = TRACKER.read_text(encoding="utf-8")
    rows = STATUS_PATTERN.findall(text)

    if not rows:
        print("No task rows found.")
        return 1

    by_status = {}
    for _task_id, status in rows:
        by_status[status] = by_status.get(status, 0) + 1

    total = len(rows)
    done = by_status.get("done", 0)
    blocked = by_status.get("blocked_on_you", 0)
    in_progress = by_status.get("in_progress", 0)
    todo = by_status.get("todo", 0)

    pct = (done / total * 100) if total else 0

    print("=" * 50)
    print("SEO Tracker Status")
    print("=" * 50)
    print(f"Total tasks:     {total}")
    print(f"Done:            {done} ({pct:.1f}%)")
    print(f"In progress:     {in_progress}")
    print(f"Blocked on you:  {blocked}")
    print(f"Todo:            {todo}")
    print("=" * 50)

    # Phase breakdown
    phases = re.split(r"(?=## Phase )", text)
    for block in phases:
        m = PHASE_PATTERN.search(block)
        if not m:
            continue
        phase = m.group(1)
        phase_rows = STATUS_PATTERN.findall(block)
        if not phase_rows:
            continue
        phase_done = sum(1 for _, s in phase_rows if s == "done")
        phase_total = len(phase_rows)
        phase_pct = phase_done / phase_total * 100 if phase_total else 0
        print(f"Phase {phase}: {phase_done}/{phase_total} ({phase_pct:.0f}%)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
