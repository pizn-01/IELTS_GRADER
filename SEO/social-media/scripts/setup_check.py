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
    has_env_file = env_path.exists()
    # On Fly/Docker, keys come from process env (fly secrets) — .env file is optional.
    in_container = Path("/app/social-media").exists() or bool(
        os.getenv("FLY_APP_NAME") or os.getenv("FLY_MACHINE_ID")
    )

    serper = bool(os.getenv("SERPER_API_KEY", "").strip())
    youtube = bool(os.getenv("YOUTUBE_API_KEY", "").strip())
    openai = bool(os.getenv("OPENAI_API_KEY", "").strip())

    if in_container:
        flag(
            "Config source",
            True,
            "",
        )
        print("         → Fly secrets / process env (no .env file needed in production)")
    else:
        flag(
            ".env file",
            has_env_file,
            f"Local only: copy .env.example to .env in {SCRIPTS}",
        )

    flag(
        "SERPER_API_KEY",
        serper,
        (
            "Set on Fly: fly secrets set SERPER_API_KEY=…  (serper.dev)"
            if in_container
            else "Needed for Facebook/Instagram/Quora/X/LinkedIn/TikTok (serper.dev)"
        ),
    )
    flag(
        "YOUTUBE_API_KEY",
        youtube,
        (
            "Set on Fly: fly secrets set YOUTUBE_API_KEY=…  (Google Cloud → YouTube Data API v3)"
            if in_container
            else "Needed for YouTube listening (Google Cloud → YouTube Data API v3)"
        ),
    )
    flag(
        "OPENAI_API_KEY",
        openai,
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
    flag(
        "EMPLOYEE_PLAYBOOK.pdf",
        playbook.exists(),
        "Should live in SEO/social-media/ (or /app/social-media in Docker)",
    )

    print()
    if ok:
        print("All critical checks passed.")
        print("Next: Cold start once, then Monday “Start / refresh week”.")
        return 0
    print("Fix the MISSING items, then run this check again.")
    if in_container and (not serper or not youtube):
        print()
        print("Production fix (from your laptop):")
        print("  cd backend")
        print("  fly secrets set SERPER_API_KEY=your_key YOUTUBE_API_KEY=your_key")
    return 1


def main() -> int:
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
