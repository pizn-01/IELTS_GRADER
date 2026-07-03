# IELTS Grading Engine (Python)

This is the client's grading engine, sourced from
[amirmohamadian/Ielts-v0](https://github.com/amirmohamadian/Ielts-v0) and
integrated into the IELTS Grader Node.js backend. These are the files to
edit to change grading behavior.

## Files

| File | Purpose |
|---|---|
| `AnswerGrader.py` | Task 2 essay grading — standalone grader (v7.x): 20-call mega-batch, dual-model scoring (Model A + Model B), per-criterion error detection, revision, vocabulary, grammar, argumentation, and flow analysis. Prompts live inside this file. |
| `Task1LetterGrader.py` | Task 1 (General Training) letter grading — same architecture. Uses "Task Achievement" as the first criterion name. |
| `Task1ReportGrader.py` | Task 1 (Academic) report/chart grading — same architecture. Accepts `--chart-type`; chart images are accepted but not yet sent to a vision model. |
| `ImportedQuestionAnalyzer.py` | Detects task type + extracts letter bullet points / chart type from raw question text. Used by the Node bridge to auto-fill Task 1 metadata. |
| `OCRHandler.py` | OCR handling for image-based submissions. |
| `requirements.txt` | `python-dotenv`, `openai`, `tiktoken`. |

> **Note:** `v0_common.py` (the original v0 stub, later an interim grading
> core) has been removed. Each grader is now fully standalone with its own
> prompts.

## Output contract

The graders print their own rich JSON schema to stdout (`overall_band`,
`criteria_scores`, `averaged_scoring`, `all_errors`, `revision_data`,
`vocabulary`, `grammar`, `argumentation_analysis`/`flow_logic_analysis`,
etc.).

`backend/src/services/pythonGrader.js` adapts that schema (see
`mapPythonResult()`) to the flat contract the Supabase `reports` /
`report_errors` tables and the report UI (`ReportView.jsx`) consume:
`response_band`, `coherence_band`, `vocabulary_band`, `grammar_band`,
`strengths`, `weaknesses`, `errors`, `high_impact_fixes`, `model_answer`,
`vocabulary_analysis`, `grammar_analysis`, `data_structure_analysis`,
`sub_category_scores`, `secondary_bands`.

If you change the Python output schema, update `mapPythonResult()` in
`pythonGrader.js` accordingly.

## Editing grading criteria

Prompts are plain-English strings inside each grader file (e.g. the
error-detection, scoring, revision, vocabulary, and grammar prompt builders
in `AnswerGrader.py`). Edit them there, then restart the backend — or
re-run a script directly (below) to test.

## Testing a script standalone (without Node)

```bash
cd backend/python
python3 -m venv .venv
# Windows: .venv\Scripts\activate       macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=sk-proj-...   # or put it in backend/.env

python AnswerGrader.py \
  --exam-name "IELTS Writing Task 2" \
  --prompt "Some people believe technology has made communication less personal. Discuss both views and give your own opinion." \
  --user-answer "Technology has changed how people communicate in recent decades..."
```

This prints the full JSON report to stdout — exactly what the Node backend
receives when it spawns this script for a real user submission.

## How this is invoked from the Node backend

See `backend/src/services/pythonGrader.js`. It resolves a Python
interpreter (prefers `backend/python/.venv` if present — created at Docker
build time in production), spawns the appropriate script with
`child_process.spawn`, parses the JSON from stdout, adapts it with
`mapPythonResult()`, and writes the result to Supabase.

Whether this engine or the JS engine (`grader.js`) is active is controlled
by the `GRADING_ENGINE` environment variable — see the root
`DEVELOPER_GUIDE.md` for details.
