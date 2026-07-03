#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def _load_repo_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")


_load_repo_dotenv()

TASK1_LETTER = "task1-letter"
TASK1_REPORT = "task1-report"
TASK2_ESSAY = "task2"


def read_input_text(args: argparse.Namespace) -> str:
    if args.stdin:
        return sys.stdin.read()
    if args.question_text:
        return args.question_text
    raise ValueError("No question text provided")


def normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_common_instructions(text: str) -> str:
    lines = [line.strip() for line in text.split("\n")]
    filtered: List[str] = []

    removable_prefixes = [
        r"^you should spend about \d+ minutes on this task\.?\s*",
        r"^you should write at least \d+ words\.?\s*",
        r"^write at least \d+ words\.?\s*",
        r"^write about the following topic[:\s-]*",
        r"^give reasons for your answer(?: and include any relevant examples)?\.?\s*",
        r"^include any relevant examples\.?\s*",
        r"^summarise the information by selecting and reporting the main features(?:,? and make comparisons where relevant)?\.?\s*",
        r"^summarize the information by selecting and reporting the main features(?:,? and make comparisons where relevant)?\.?\s*",
        r"^make comparisons where relevant\.?\s*",
    ]

    for line in lines:
        cleaned_line = line
        for pattern in removable_prefixes:
            cleaned_line = re.sub(pattern, "", cleaned_line, flags=re.IGNORECASE)

        if not cleaned_line.strip():
            continue

        filtered.append(cleaned_line.strip())

    cleaned = "\n".join(filtered)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def split_lines(text: str) -> List[str]:
    return [line.strip() for line in text.split("\n") if line.strip()]


def score_task(text: str) -> Dict[str, int]:
    lowered = text.lower()
    scores = {
        TASK1_LETTER: 0,
        TASK1_REPORT: 0,
        TASK2_ESSAY: 0,
    }

    if "write a letter" in lowered:
        scores[TASK1_LETTER] += 6
    if "begin your letter as follows" in lowered:
        scores[TASK1_LETTER] += 5
    if re.search(r"dear\s+(sir|madam|mr\.?|ms\.?|mrs\.?|\[friend)", lowered):
        scores[TASK1_LETTER] += 4
    if len(extract_bullet_points(text)) >= 2:
        scores[TASK1_LETTER] += 3

    report_keywords = [
        "the graph below",
        "the chart below",
        "the table below",
        "the diagram below",
        "the maps below",
        "the map below",
        "the process below",
        "line graph",
        "bar chart",
        "pie chart",
        "table",
        "diagram",
        "process",
        "map",
        "illustrates",
        "shows",
        "compares",
    ]
    for keyword in report_keywords:
        if keyword in lowered:
            scores[TASK1_REPORT] += 2
    if "summarise the information" in lowered or "summarize the information" in lowered:
        scores[TASK1_REPORT] += 6
    if "main features" in lowered:
        scores[TASK1_REPORT] += 2
    if "make comparisons where relevant" in lowered:
        scores[TASK1_REPORT] += 2
    if "<svg" in lowered:
        scores[TASK1_REPORT] += 5

    essay_keywords = [
        "to what extent do you agree or disagree",
        "discuss both views and give your opinion",
        "what are the advantages and disadvantages",
        "what problems does this cause",
        "what are the causes",
        "what are the main causes",
        "why is this happening",
        "is this a positive or negative development",
        "do you agree or disagree",
        "give your own opinion",
    ]
    for keyword in essay_keywords:
        if keyword in lowered:
            scores[TASK2_ESSAY] += 3
    if lowered.count("?") >= 1:
        scores[TASK2_ESSAY] += 1

    return scores


def choose_task(scores: Dict[str, int]) -> Tuple[str, float]:
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    task, best = ordered[0]
    second = ordered[1][1]
    if best <= 0:
        return TASK2_ESSAY, 0.34
    confidence = min(0.99, 0.5 + ((best - second) / max(best, 1)) * 0.4)
    return task, round(confidence, 2)


def extract_opening_line(text: str) -> str:
    lines = split_lines(text)
    for line in lines:
        if line.lower().startswith("dear "):
            return line.rstrip(" :")

    match = re.search(
        r"begin your letter as follows[:\s]+(dear[^\n]+)",
        text,
        flags=re.IGNORECASE,
    )
    if match:
        return match.group(1).strip().rstrip(" :")
    return ""


def infer_letter_type(text: str, opening_line: str) -> str:
    lowered = text.lower()
    opening_lower = opening_line.lower()

    if any(marker in lowered for marker in ["informal", "friend", "close friend"]):
        return "informal"
    if any(marker in lowered for marker in ["semi-formal", "semi formal", "neighbor", "manager", "landlord", "supervisor"]):
        return "semi-formal"
    if any(marker in lowered for marker in ["formal", "sir or madam", "customer service", "local council", "company", "manager"]):
        return "formal"

    if "sir or madam" in opening_lower:
        return "formal"
    if re.search(r"dear\s+\[friend|'?friend", opening_lower):
        return "informal"
    if re.search(r"dear\s+(mr\.?|ms\.?|mrs\.?)", opening_lower):
        return "semi-formal"
    if opening_lower.startswith("dear "):
        return "semi-formal"
    return "formal"


def extract_bullet_points(text: str) -> List[str]:
    lines = split_lines(text)
    bullet_points: List[str] = []

    # Pass 1: explicit bullet/numbered/lettered markers on any line
    _BULLET_RE = re.compile(r"^(?:[-*•–—]|\d+[.):–]|[a-zA-Z][.):–])\s+\S", re.UNICODE)
    _STRIP_MARKER = re.compile(r"^(?:[-*•–—]|\d+[.):–]|[a-zA-Z][.):–])\s+")
    for line in lines:
        if _BULLET_RE.match(line):
            clean = _STRIP_MARKER.sub("", line).strip()
            if clean and len(clean.split()) >= 2:
                bullet_points.append(clean)

    if not bullet_points:
        # Pass 2: collect lines after common IELTS letter trigger phrases
        trigger_phrases = [
            "in your letter",
            "in the letter",
            "your letter should",
            "the letter should",
            "you should include",
            "you should mention",
            "you should explain",
            "you should say",
            "you should describe",
            "you should cover",
            "include the following",
            "cover the following",
            "the following points",
            "write a letter",
            "you should write",
        ]
        skip_re = re.compile(
            r"write at least|you should spend|begin your letter|you do not need",
            re.IGNORECASE,
        )
        collecting = False
        for line in lines:
            lowered = line.lower()
            if any(phrase in lowered for phrase in trigger_phrases):
                collecting = True
                continue
            if collecting:
                if not line or skip_re.search(line):
                    if bullet_points:
                        break
                    continue
                if not line.lower().startswith("dear ") and len(line.split()) >= 3:
                    bullet_points.append(line)
                    if len(bullet_points) >= 5:
                        break

    seen: set = set()
    cleaned_points: List[str] = []
    for point in bullet_points:
        normalized = point.strip(" .")
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned_points.append(normalized)

    return cleaned_points[:5]


def extract_letter_prompt(text: str, opening_line: str, bullet_points: List[str]) -> str:
    cleaned = strip_common_instructions(text)
    if opening_line:
        cleaned = cleaned.replace(opening_line, "")
    for bullet in bullet_points:
        cleaned = re.sub(re.escape(bullet), "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"begin your letter as follows:?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:[-*•]|\d+[.)])\s*", "", cleaned)
    cleaned = normalize_whitespace(cleaned)

    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    prompt_parts: List[str] = []
    for part in parts:
        lowered = part.lower()
        if any(marker in lowered for marker in ["write a letter", "in your letter", "you should write at least"]):
            continue
        prompt_parts.append(part.strip())

    prompt = " ".join(part for part in prompt_parts if part)
    return prompt or cleaned


def infer_chart_type(text: str) -> str:
    lowered = text.lower()
    chart_map = [
        ("bar chart", "Bar Chart"),
        ("time-series bar chart", "Time-series Bar Chart"),
        ("line graph", "Line Graph"),
        ("multiple-line graph", "Multiple-line Graph"),
        ("pie chart", "Pie Chart"),
        ("table", "Table"),
        ("process", "Process Diagram"),
        ("diagram", "Diagram"),
        ("map", "Map"),
        ("maps", "Map"),
        ("graph", "Graph"),
        ("chart", "Chart"),
    ]
    for needle, label in chart_map:
        if needle in lowered:
            return label
    return "Chart"


def extract_report_prompt(text: str) -> str:
    cleaned = strip_common_instructions(text)
    cleaned = re.sub(r"<svg[\s\S]*?</svg>", "", cleaned, flags=re.IGNORECASE)
    cleaned = normalize_whitespace(cleaned)
    return cleaned


def extract_essay_prompt(text: str) -> str:
    cleaned = strip_common_instructions(text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def build_letter_payload(text: str, openai_bullets: Optional[List[str]] = None) -> Dict[str, object]:
    opening_line = extract_opening_line(text)
    # Prefer OpenAI-extracted bullets; fall back to rule-based
    bullet_points = openai_bullets if openai_bullets else extract_bullet_points(text)
    prompt = extract_letter_prompt(text, opening_line, bullet_points)
    letter_type = infer_letter_type(text, opening_line)
    return {
        "task": TASK1_LETTER,
        "taskLabel": "Task 1 Letter",
        "examName": "IELTS General Training Writing Task 1",
        "durationMinutes": 20,
        "minWords": 150,
        "prompt": prompt,
        "bulletPoints": bullet_points,
        "letterType": letter_type,
        "openingLine": opening_line,
        "chartType": None,
        "warnings": [] if bullet_points else ["Bullet points were not clearly detected. Review the imported prompt before grading."],
    }


def build_report_payload(text: str) -> Dict[str, object]:
    prompt = extract_report_prompt(text)
    chart_type = infer_chart_type(text)
    warnings: List[str] = []
    if "<svg" not in text.lower() and chart_type in {"Graph", "Chart", "Line Graph", "Bar Chart", "Table", "Pie Chart", "Time-series Bar Chart"}:
        warnings.append("Imported report prompt may not include all chart values. Pasting the full prompt or chart data will improve grading accuracy.")
    return {
        "task": TASK1_REPORT,
        "taskLabel": "Task 1 Report",
        "examName": "IELTS Writing Task 1 Academic Report",
        "durationMinutes": 20,
        "minWords": 150,
        "prompt": prompt,
        "bulletPoints": [],
        "letterType": None,
        "openingLine": "",
        "chartType": chart_type,
        "warnings": warnings,
    }


def build_essay_payload(text: str) -> Dict[str, object]:
    prompt = extract_essay_prompt(text)
    return {
        "task": TASK2_ESSAY,
        "taskLabel": "Task 2 Essay",
        "examName": "IELTS Writing Task 2",
        "durationMinutes": 40,
        "minWords": 250,
        "prompt": prompt,
        "bulletPoints": [],
        "letterType": None,
        "openingLine": "",
        "chartType": None,
        "warnings": [],
    }


def classify_with_openai(text: str) -> Optional[Dict[str, object]]:
    """Use OpenAI GPT to classify the IELTS task type and extract bullet points for letters."""
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        prompt = (
            "You are an IELTS exam classifier. Classify the following question text as exactly one of:\n"
            "- task1-letter  : IELTS General Training Task 1 (writing a formal, semi-formal, or informal letter)\n"
            "- task1-report  : IELTS Academic Task 1 (describing a graph, chart, table, diagram, map, or process)\n"
            "- task2         : IELTS Task 2 (essay — opinion, discussion, problem-solution, or advantages/disadvantages)\n\n"
            "For task1-letter ALSO extract the bullet-point requirements (the specific things the letter must address).\n"
            "Respond with ONLY a JSON object. Examples:\n"
            '  {"task": "task1-letter", "confidence": 0.97, "bullet_points": ["explain why you are writing", "describe the problem", "say what action you want taken"]}\n'
            '  {"task": "task1-report", "confidence": 0.95, "bullet_points": []}\n'
            '  {"task": "task2",        "confidence": 0.93, "bullet_points": []}\n\n'
            f"Question text:\n{text[:3000]}"
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=200,
        )
        content = response.choices[0].message.content.strip()
        match = re.search(r"\{[\s\S]+\}", content)
        if match:
            result = json.loads(match.group())
            task = result.get("task", "")
            confidence = float(result.get("confidence", 0.85))
            bullet_points = result.get("bullet_points", [])
            if task in (TASK1_LETTER, TASK1_REPORT, TASK2_ESSAY):
                return {
                    "task": task,
                    "confidence": round(confidence, 2),
                    "bullet_points": bullet_points if isinstance(bullet_points, list) else [],
                }
    except Exception:
        pass
    return None


def analyze_question(raw_text: str) -> Dict[str, object]:
    normalized = normalize_whitespace(raw_text)

    # Try OpenAI classification first; fall back to rule-based scoring
    openai_result = classify_with_openai(normalized)
    if openai_result:
        task = openai_result["task"]
        confidence = openai_result["confidence"]
    else:
        scores = score_task(normalized)
        task, confidence = choose_task(scores)

    # Always compute rule-based scores for reference / debugging
    scores = score_task(normalized)

    if task == TASK1_LETTER:
        openai_bullets = (openai_result or {}).get("bullet_points") or None
        payload = build_letter_payload(normalized, openai_bullets)
    elif task == TASK1_REPORT:
        payload = build_report_payload(normalized)
    else:
        payload = build_essay_payload(normalized)

    payload["confidence"] = confidence
    payload["scores"] = scores
    payload["rawText"] = normalized
    payload["cleanedQuestion"] = payload["prompt"]
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze imported IELTS question text")
    parser.add_argument("--question-text", help="Question text to analyze")
    parser.add_argument("--stdin", action="store_true", help="Read question text from stdin")
    args = parser.parse_args()

    try:
        input_text = read_input_text(args)
        result = analyze_question(input_text)
        print(json.dumps(result, ensure_ascii=True))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()