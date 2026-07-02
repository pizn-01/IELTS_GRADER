#!/usr/bin/env python3
"""
OCRHandler.py — extracts text from an uploaded image/file.

UNCHANGED from the original client file — it is still a lightweight
placeholder (only .txt/.md files are actually read; anything else returns
a placeholder string) and does not perform real OCR.

NOT CURRENTLY WIRED INTO THE IELTS GRADER PIPELINE. The current frontend
only accepts typed/pasted essay text (see MockExam.jsx / PracticeModal.jsx)
— there is no image upload flow calling this script. Left in place for a
future enhancement (e.g. uploading a handwritten essay photo) rather than
removed, since the client's original OCR intent may still be wanted later.
"""
import argparse
import json
from pathlib import Path


def extract_text(file_path: str) -> str:
    p = Path(file_path)
    suffix = p.suffix.lower()
    name = p.name

    # Lightweight v0 OCR behavior: keep pipeline stable without heavy dependencies.
    if suffix in {".txt", ".md"}:
        try:
            return p.read_text(encoding="utf-8", errors="ignore").strip()
        except Exception:
            pass

    return (
        f"[v0 OCR placeholder] Extracted text from file '{name}'. "
        "Please paste or edit the question/answer text before grading."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image_path", type=str, required=True)
    args = parser.parse_args()

    text = extract_text(args.image_path)
    print(json.dumps({"text": text}))


if __name__ == "__main__":
    main()
