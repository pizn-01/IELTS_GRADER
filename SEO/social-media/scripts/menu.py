#!/usr/bin/env python3
"""
Employee front door — numbered menu. No need to remember script names.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))


def _run(script: str, extra: list[str] | None = None) -> None:
    cmd = [sys.executable, str(SCRIPTS / script)] + (extra or [])
    subprocess.run(cmd, cwd=str(SCRIPTS), check=False)


def main() -> int:
    while True:
        print(
            """
========================================
  IELTSGRADER Social Ops Agent
  (prepares work — you paste & publish)
========================================
  1) Start / refresh my week
  2) Show today's work
  3) Copy next reply/post to clipboard
  4) Mark something done
  5) Sunday scorecard
  6) First-time setup check
  7) Exit
----------------------------------------
"""
        )
        choice = input("Choose 1–7: ").strip()
        if choice == "1":
            dry = input("Dry run (no APIs)? [y/N]: ").strip().lower() == "y"
            _run("run_weekly_agent.py", ["--dry-run"] if dry else None)
        elif choice == "2":
            _run("run_daily_brief.py")
        elif choice == "3":
            _run("copy_next.py")
        elif choice == "4":
            _run("mark_done.py", ["--interactive"])
        elif choice == "5":
            _run("run_sunday_wrap.py")
        elif choice == "6":
            _run("setup_check.py")
            cold = input("\nRun cold start (first time only)? [y/N]: ").strip().lower()
            if cold == "y":
                dry = input("Dry run? [y/N]: ").strip().lower() == "y"
                _run("run_cold_start_agent.py", ["--dry-run"] if dry else None)
        elif choice == "7" or choice.lower() in ("q", "quit", "exit"):
            print("Bye — remember: value first, disclose when you promote.")
            return 0
        else:
            print("Please enter a number 1–7.")
        input("\nPress Enter to return to the menu…")


if __name__ == "__main__":
    raise SystemExit(main())
