# IELTS Grading Engine (Python)

This is the client's original grading engine, sourced from
[amirmohamadian/Ielts-v0](https://github.com/amirmohamadian/Ielts-v0),
`examinee/` folder. It was integrated into the IELTS Grader Node.js
backend and is the file set the client can edit to change grading
behavior directly.

## What was changed from the original repo, and why

The original files in `Ielts-v0/examinee/` were a **v0 compatibility
stub** — `v0_common.py` returned hardcoded placeholder scores (fixed 6.0
bands, static text like *"Stable v0 grammar analysis (lightweight
mode)"*) with no real OpenAI calls anywhere. This let the client wire up
and test the surrounding pipeline (server.js, HTML pages) before real
grading logic existed.

| File | Status | What changed |
|---|---|---|
| `v0_common.py` | **Rewritten** | Replaced every hardcoded placeholder with real OpenAI-backed grading (3-call pipeline: primary grade, independent secondary grade, deep analysis). Output JSON shape changed to match our Supabase `reports` table exactly — see the top-of-file comment in that file for the full list of changes and reasoning. |
| `AnswerGrader.py` | Unchanged (comment only) | CLI wrapper for Task 2 essay grading — calls `build_report()`, same signature as before. |
| `Task1LetterGrader.py` | Unchanged (comment only) | CLI wrapper for Task 1 (General) letter grading. |
| `Task1ReportGrader.py` | Unchanged (comment only) | CLI wrapper for Task 1 (Academic) report/chart grading. Chart images are accepted but not yet sent to a vision model (see comment in file). |
| `ImportedQuestionAnalyzer.py` | Unchanged | Detects task type + extracts letter bullet points from raw question text via keyword heuristics (no OpenAI). Used by our Node bridge to auto-fill Task 1 metadata since our database doesn't store it explicitly. |
| `OCRHandler.py` | Unchanged | Still a placeholder (only reads `.txt`/`.md` files). Not currently called by anything in the pipeline — the frontend has no image-upload flow. Left in for future use. |
| `requirements.txt` | Unchanged | `python-dotenv`, `openai`, `tiktoken`. |

## Output contract

`build_report()` returns a dict with this shape (all scripts print it as
JSON to stdout):

```json
{
  "overall_band": 6.5,
  "response_band": 6.0,
  "coherence_band": 7.0,
  "vocabulary_band": 6.5,
  "grammar_band": 6.5,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "high_impact_fixes": [{ "issue": "...", "suggestion": "...", "impact": "High" }],
  "errors": [{ "title": "...", "severity": "Major", "criteria": "Task Response", "sub_category": "...", "location_text": "...", "original_text": "...", "correction_text": "...", "explanation": "..." }],
  "sub_category_scores": { "Task Response": [...], "...": [...] },
  "model_answer": { "text": "...", "estimated_band": 8.0, "key_changes": ["..."] },
  "vocabulary_analysis": { "categories": [...] },
  "grammar_analysis": { "overview_strengths": "...", "...": "..." },
  "data_structure_analysis": { "overview": "...", "...": "..." },
  "secondary_bands": { "model": "gpt-4o", "overall_band": 6.5, "..." },
  "meta": { "engine": "python-v1", "task": "task2", "...": "..." }
}
```

This is consumed by `backend/src/services/pythonGrader.js`, which writes
it into the `reports` and `report_errors` tables — the exact same tables
`backend/src/services/grader.js` (the JS engine) writes to. The report UI
(`ReportView.jsx`) doesn't know or care which engine produced the data.

## Editing grading criteria

To change what the AI grades on, or how, edit the prompt-building
functions in `v0_common.py`:

- `_build_primary_prompt()` — the main grading pass. Controls band
  scoring criteria, error detection, strengths/weaknesses.
- `_build_secondary_prompt()` — the independent second-opinion grade.
- `_build_deep_prompt()` — model answer, vocabulary, grammar, and
  structure analysis.

The prompts are plain English text — no special syntax required. After
editing, restart the backend (or just re-run a script directly, see
below) to test your changes.

## Testing a script standalone (without Node)

```bash
cd backend/python
python -m venv .venv
# Windows: .venv\Scripts\activate       macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in OPENAI_API_KEY

python AnswerGrader.py \
  --exam-name "IELTS Writing Task 2" \
  --prompt "Some people believe technology has made communication less personal. Discuss both views and give your own opinion." \
  --user-answer "Technology has changed how people communicate in recent decades..."
```

This prints the full JSON report to stdout — exactly what the Node
backend receives when it spawns this script for a real user submission.

## How this is invoked from the Node backend

See `backend/src/services/pythonGrader.js`. In short: it resolves a
Python interpreter (prefers `backend/python/.venv` if present, matching
the resolution logic the client's own `server.js` used), then spawns the
appropriate script with `child_process.spawn`, passing the same
`--exam-name` / `--prompt` / `--user-answer` / etc. arguments the
client's original `server.js` used.

Whether this engine or the JS engine (`grader.js`) is active is
controlled by the `GRADING_ENGINE` environment variable — see the root
`DEVELOPER_GUIDE.md` for details.
