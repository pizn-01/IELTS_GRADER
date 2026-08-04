# Data study #2 — Collection protocol

**Title (publish later):** ChatGPT vs specialized AI vs examiner: we scored the same essays with all three  
**Roadmap:** D9 #2 · Weeks 5–6 publish target  
**Status:** Collection design ready — gather essays + run scoring (shared: agent setup + you/examiner)

---

## Goal

Produce a citation-worthy accuracy study showing how three scorers diverge on the **same** IELTS Writing responses:
1. ChatGPT (fixed prompt)
2. IELTSGRADER / IELTS AI Tutor
3. Human examiner-style scoring (qualified rater or IELTS-trained tutor)

This feeds trust posts (`is-chatgpt-accurate-ielts-writing`, `why-chatgpt-overestimates-ielts-band-scores`) and earns backlinks.

---

## Guardrails

- **Anonymize** all essays: strip names, emails, schools, countries if identifiable, unique personal stories that could dox.
- **Consent:** only use essays with practice-platform consent or newly written sample essays under study consent.
- **No fake “official IELTS” claim:** label human scores as “examiner-trained rater / IELTS tutor using public descriptors,” unless a real former examiner is contracted.
- Store raw scores privately; publish aggregates + a few anonymized examples.

---

## Sample size

| Phase | N | Notes |
|-------|---|--------|
| Pilot | 10 | Validate prompt + sheet; catch process bugs |
| Full study | 50 | Roadmap target; mix Task 2 types |
| Minimum publishable | 30 | If 50 is slow |

**Mix (Task 2 focus for v1):**
- Opinion / to-what-extent: 30%
- Discuss both views: 25%
- Advantages/disadvantages: 15%
- Problem-solution: 15%
- Two-part: 15%

Optional v1.1: 10 Academic Task 1 + 5 GT letters (separate table).

**Band spread target:** roughly even across ~5.5–8.0 so results aren’t all mid-band.

---

## Fixed ChatGPT prompt (do not change mid-study)

```
You are scoring an IELTS Academic Writing Task 2 essay using the public IELTS band descriptors.

Return ONLY valid JSON with this shape:
{
  "overall": <number 0-9 step 0.5>,
  "task_response": <number>,
  "coherence_cohesion": <number>,
  "lexical_resource": <number>,
  "grammatical_range_accuracy": <number>,
  "brief_rationale": "<max 80 words>"
}

Essay question:
<<<QUESTION>>>

Candidate essay:
<<<ESSAY>>>
```

Use the same model version for the whole study (record model name + date in the sheet).

---

## IELTSGRADER scoring

- Submit via normal product flow (or internal API if available).
- Record overall + TR/CC/LR/GRA exactly as returned.
- Record product version / date.

---

## Human rater scoring

- Same public descriptors; score blind to AI outputs.
- Record overall + four criteria + 1–2 sentence note on the capping criterion.
- Ideal: one primary rater for all 50; optional second rater on 20% for agreement check.

---

## Spreadsheet columns

`essay_id | question_type | word_count | chatgpt_overall | chatgpt_tr | chatgpt_cc | chatgpt_lr | chatgpt_gra | ig_overall | ig_tr | ig_cc | ig_lr | ig_gra | human_overall | human_tr | human_cc | human_lr | human_gra | human_cap_note | chatgpt_minus_human | ig_minus_human`

---

## Analysis to publish

1. Mean absolute error vs human (ChatGPT vs IELTSGRADER)
2. % of essays where ChatGPT overall > human by ≥0.5 / ≥1.0
3. Which criterion diverges most (often TR or LR)
4. 3 anonymized case studies (ChatGPT high / human mid)
5. Methodology appendix (prompt, model, rater credentials, limitations)

---

## Agent vs you

| Step | Owner |
|------|--------|
| Protocol + publish outline (this file) | Agent — **done** |
| Essay corpus (consent + anonymize) | You / shared |
| Run ChatGPT + IELTSGRADER rows | Shared |
| Human ratings | You (or hired rater) |
| Charts + blog draft + pitch communities | Agent after sheet ≥30 rows |

---

## Folder

- Protocol: `SEO/data-studies/chatgpt-vs-us-vs-examiner-PROTOCOL.md` (this file)
- Sheet: keep private (Google Sheet / local CSV — do **not** commit PII)
- Publish draft later: `ielts-grader-app/src/content/blog/` (new slug) when data ready
