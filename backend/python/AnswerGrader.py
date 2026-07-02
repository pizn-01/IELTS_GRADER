#!/usr/bin/env python3
"""
AnswerGrader.py — CLI entry point for IELTS Writing Task 2 grading.

Unchanged from the original file except for this comment. All the
real work happens in v0_common.build_report(), which was rewritten to
perform real OpenAI-backed grading — see the header comment in
v0_common.py for full details of what changed and why.

Invoked by backend/src/services/pythonGrader.js as:
  python AnswerGrader.py --exam-name "..." --prompt "..." --user-answer "..."
"""
import argparse
import json

from v0_common import build_report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam-name", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--user-answer", type=str, required=True)
    args = parser.parse_args()

    result = build_report(
        task="task2",
        exam_name=args.exam_name,
        prompt=args.prompt,
        user_answer=args.user_answer,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
