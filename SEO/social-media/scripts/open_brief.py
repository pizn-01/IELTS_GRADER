#!/usr/bin/env python3
"""Open THIS_WEEK/OPEN_ME.md for the employee."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_io import open_brief_file, write_open_me  # noqa: E402


def open_this_week(prefer: str = "today") -> None:
    path = write_open_me(prefer)
    open_brief_file(path)


def main() -> int:
    prefer = "week" if "--week" in sys.argv else "today"
    open_this_week(prefer)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
