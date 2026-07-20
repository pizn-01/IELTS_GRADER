#!/usr/bin/env python3
"""Plain-English setup health check for managers / first-time."""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv  # noqa: E402

SCRIPTS = Path(__file__).resolve().parent
load_dotenv(SCRIPTS / ".env")


def check() -> int:
    print("Setup check\n")
    ok = True

    def flag(name: str, good: bool, help_text: str) -> None:
        nonlocal ok
        mark = "OK" if good else "MISSING"
        print(f"  [{mark}] {name}")
        if not good:
            ok = False
            print(f"         → {help_text}")

    env_path = SCRIPTS / ".env"
    flag(".env file", env_path.exists(), f"Copy .env.example to .env in {SCRIPTS}")

    flag(
        "SERPER_API_KEY",
        bool(os.getenv("SERPER_API_KEY", "").strip()),
        "Needed for Facebook/Instagram/Quora/X/LinkedIn/TikTok discovery (serper.dev)",
    )
    flag(
        "YOUTUBE_API_KEY",
        bool(os.getenv("YOUTUBE_API_KEY", "").strip()),
        "Needed for YouTube listening (Google Cloud → YouTube Data API v3)",
    )
    flag(
        "OPENAI_API_KEY",
        bool(os.getenv("OPENAI_API_KEY", "").strip()),
        "Needed for drafted replies/posts (templates still work without it)",
    )

    try:
        import openai  # noqa: F401

        flag("openai package", True, "")
    except ImportError:
        flag("openai package", False, "pip install -r requirements.txt")

    try:
        import requests  # noqa: F401

        flag("requests package", True, "")
    except ImportError:
        flag("requests package", False, "pip install -r requirements.txt")

    playbook = SCRIPTS.parent / "EMPLOYEE_PLAYBOOK.pdf"
    flag("EMPLOYEE_PLAYBOOK.pdf", playbook.exists(), "Should live in SEO/social-media/")

    print()
    if ok:
        print("All critical checks passed (OpenAI optional for template mode).")
        print("Next: run cold start once, then Monday menu option 1.")
        return 0
    print("Fix the MISSING items, then run this check again.")
    return 1


def main() -> int:
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
