#!/usr/bin/env python3
"""
ImportedQuestionAnalyzer.py — detects task type (Task 2 essay / Task 1
letter / Task 1 report) and extracts letter bullet points from raw
question text using simple keyword heuristics. No OpenAI calls — this is
pure text pattern matching, same as the original client file.

UNCHANGED from the original client file.

Used by backend/src/services/pythonGrader.js to auto-detect Task 1
metadata (letter_type, bullet_points, chart_type) from the question_text
stored in our exam_tasks table, since that table does not store these
fields explicitly. If the client tunes the detection heuristics in this
file, those changes take effect automatically without any Node changes.
"""
import argparse
import json
import re
import sys
from typing import Dict, List


TASK1_LETTER = "task1-letter"
TASK1_REPORT = "task1-report"
TASK2_ESSAY = "task2"


def _read_input(args: argparse.Namespace) -> str:
    if args.stdin:
        return sys.stdin.read()
    return args.question_text or ""


def _normalize(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _extract_bullets(text: str) -> List[str]:
    bullets: List[str] = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if re.match(r"^[-*•]\s+", s):
            bullets.append(re.sub(r"^[-*•]\s+", "", s).strip())
        elif re.match(r"^\d+[.)]\s+", s):
            bullets.append(re.sub(r"^\d+[.)]\s+", "", s).strip())
    return bullets[:4]


def _detect_task(text: str) -> str:
    t = text.lower()

    report_markers = [
        "chart", "graph", "table", "diagram", "map", "process",
        "bar chart", "line graph", "pie chart",
    ]
    if any(m in t for m in report_markers):
        return TASK1_REPORT

    letter_markers = [
        "write a letter", "dear", "sir or madam", "manager", "landlord", "friend",
    ]
    if any(m in t for m in letter_markers):
        return TASK1_LETTER

    return TASK2_ESSAY


def analyze(text: str) -> Dict[str, object]:
    normalized = _normalize(text)
    task = _detect_task(normalized)
    bullets = _extract_bullets(normalized)

    if task == TASK1_LETTER and not bullets:
        bullets = [
            "explain why you are writing",
            "describe the main situation",
            "state what you want the reader to do",
        ]

    chart_type = "Chart" if task == TASK1_REPORT else None
    letter_type = "formal" if task == TASK1_LETTER else None

    return {
        "task": task,
        "taskLabel": {
            TASK1_LETTER: "Task 1 Letter",
            TASK1_REPORT: "Task 1 Report",
            TASK2_ESSAY: "Task 2 Essay",
        }[task],
        "confidence": 0.78,
        "durationMinutes": 40,
        "minWords": 150 if task in (TASK1_LETTER, TASK1_REPORT) else 250,
        "prompt": normalized,
        "warnings": [],
        "bulletPoints": bullets if task == TASK1_LETTER else [],
        "letterType": letter_type,
        "openingLine": "",
        "chartType": chart_type,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--question-text", type=str, default="")
    parser.add_argument("--stdin", action="store_true")
    args = parser.parse_args()

    text = _read_input(args)
    if not text.strip():
        print(json.dumps({"error": "No question text provided"}))
        return

    print(json.dumps(analyze(text)))


if __name__ == "__main__":
    main()
