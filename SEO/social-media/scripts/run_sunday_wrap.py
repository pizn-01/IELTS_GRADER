#!/usr/bin/env python3
"""Sunday wrap: scorecard + backlog list for next week."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import THIS_WEEK, ensure_output_dirs, open_brief_file, read_status  # noqa: E402
from agent_rules import PLAYBOOK_REMEMBER  # noqa: E402
from scorecard import append_scorecards_csv, kpi_strip, write_scorecard  # noqa: E402


def run() -> int:
    ensure_output_dirs()
    if not (THIS_WEEK / "_meta" / "STATUS.csv").exists():
        print("No week data yet. Run Monday pack first.")
        return 1

    path = write_scorecard()
    append_scorecards_csv()

    pending = [
        r
        for r in read_status()
        if r.get("status") in ("pending", "awaiting_reply")
    ]
    backlog = THIS_WEEK / "SUNDAY_BACKLOG.md"
    lines = [
        "# Sunday backlog → next week",
        "",
        f"**Progress:** {kpi_strip()}",
        "",
        "Unfinished items (carry mental note into next Monday):",
        "",
    ]
    if not pending:
        lines.append("_All clear — great week._")
    else:
        for r in pending:
            lines.append(
                f"- [{r.get('status')}] {r.get('id')} · {r.get('platform')} · "
                f"{r.get('type')} — {(r.get('title') or '')[:80]}"
            )
    lines.extend(["", "Fill Insights notes in `_meta/scorecard.md`.", "", PLAYBOOK_REMEMBER])
    backlog.write_text("\n".join(lines), encoding="utf-8")

    open_me = THIS_WEEK / "OPEN_ME.md"
    open_me.write_text(
        path.read_text(encoding="utf-8")
        + "\n\n---\n\n"
        + backlog.read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    print(f"Scorecard → {path}")
    print(f"Backlog → {backlog}")
    open_brief_file(open_me)
    return 0


def main() -> int:
    return run()


if __name__ == "__main__":
    raise SystemExit(main())
