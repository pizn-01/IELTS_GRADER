#!/usr/bin/env python3
"""
Task1LetterGrader.py — CLI entry point for IELTS General Training Writing
Task 1 (letter) grading.

Unchanged from the original file except for this comment. All the
real work happens in v0_common.build_report(), which was rewritten to
perform real OpenAI-backed grading — see the header comment in
v0_common.py for full details of what changed and why.

Invoked by backend/src/services/pythonGrader.js as:
  python Task1LetterGrader.py --exam-name "..." --prompt "..." \
      --bullet-points '["...", "..."]' --letter-type formal \
      --opening-line "" --user-answer "..."
"""
import argparse
import json
from typing import List, Optional

from v0_common import build_report


def _parse_bullets(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        pass
    return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam-name", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--bullet-points", type=str, default="[]")
    parser.add_argument("--letter-type", type=str, default="formal")
    parser.add_argument("--opening-line", type=str, default="")
    parser.add_argument("--user-answer", type=str, required=True)
    args = parser.parse_args()

    result = build_report(
        task="task1-letter",
        exam_name=args.exam_name,
        prompt=args.prompt,
        user_answer=args.user_answer,
        bullet_points=_parse_bullets(args.bullet_points),
        letter_type=args.letter_type,
        opening_line=args.opening_line,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
