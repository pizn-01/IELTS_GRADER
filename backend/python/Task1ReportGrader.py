#!/usr/bin/env python3
"""
Task1ReportGrader.py — CLI entry point for IELTS Academic Writing Task 1
(report/chart) grading.

Unchanged from the original file except for this comment. All the
real work happens in v0_common.build_report(), which was rewritten to
perform real OpenAI-backed grading — see the header comment in
v0_common.py for full details of what changed and why.

NOTE — chart_image is currently accepted but not sent to a vision model
during grading (same limitation as the original v0 stub, carried forward
deliberately since the frontend does not currently support uploading a
chart image, only text answers). If chart-image analysis is wanted later,
this is the place to switch to a vision-capable model.

Invoked by backend/src/services/pythonGrader.js as:
  python Task1ReportGrader.py --exam-name "..." --prompt "..." \
      --chart-type "Bar Chart" --user-answer "..."
"""
import argparse
import base64
import json
from pathlib import Path
from typing import Optional

from v0_common import build_report


def _read_chart_image(chart_image: Optional[str], chart_image_file: Optional[str]) -> Optional[str]:
    if chart_image_file:
        p = Path(chart_image_file)
        if p.exists():
            raw = p.read_bytes()
            return "data:image/jpeg;base64," + base64.b64encode(raw).decode("utf-8")
    return chart_image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam-name", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--chart-type", type=str, required=True)
    parser.add_argument("--user-answer", type=str, required=True)
    parser.add_argument("--chart-image", type=str, default=None)
    parser.add_argument("--chart-image-file", type=str, default=None)
    args = parser.parse_args()

    chart_image = _read_chart_image(args.chart_image, args.chart_image_file)
    result = build_report(
        task="task1-report",
        exam_name=args.exam_name,
        prompt=args.prompt,
        user_answer=args.user_answer,
        chart_type=args.chart_type,
    )
    if chart_image:
        result.setdefault("meta", {})["chart_image_supplied"] = True
    print(json.dumps(result))


if __name__ == "__main__":
    main()
