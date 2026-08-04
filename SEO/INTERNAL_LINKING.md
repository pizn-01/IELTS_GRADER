# Internal Linking Map

## Hub pages (link TO these from everywhere)

| Hub | URL | Role |
|-----|-----|------|
| Pillar | `/ielts-ai-tutor` | Brand + product explainer |
| Primary converter | `/ielts-essay-checker` | Highest-intent CTA |
| Pricing | `/pricing` | Commercial intent |
| Blog index | `/blog` | Content discovery |

## Tool page cross-links

Each tool page should link to:

1. `/ielts-ai-tutor` (what is this)
2. One sibling tool page (Task 1 ↔ Task 2)
3. `/ielts-mock-writing-test` or `/ielts-essay-checker`
4. `/pricing` (soft)
5. 1 relevant blog post

```
ielts-ai-tutor
  ├── ielts-essay-checker
  ├── ielts-task-1-checker
  ├── ielts-task-2-checker
  ├── ielts-writing-band-score
  └── ielts-mock-writing-test
```

## Blog post linking rules

Every blog post must include:

| Link type | Target | Anchor example |
|-----------|--------|----------------|
| Tool CTA | `/ielts-essay-checker` | "Check your essay with the AI tutor" |
| Related post | another `/blog/slug` | topic-specific |
| Pillar (optional) | `/ielts-ai-tutor` | "Learn how our IELTS AI Tutor works" |

## Cluster links

### Band improvement cluster
- `how-ielts-writing-is-scored` → `band-6-vs-7-task-2` → `coherence-cohesion-14-day-plan` → `feedback-to-study-plan` → `/ielts-writing-band-score`

### Task 2 structure / Q&A cluster
- `best-essay-structure-ielts-task-2` → `how-many-paragraphs-ielts-essay` → `how-many-words-ielts-task-2` → `/ielts-task-2-checker`

### Task 2 samples cluster
- `band-6-vs-7-task-2` → all Task 2 samples → `/ielts-task-2-checker`

### Task 1 cluster
- `task-1-trends-vocabulary` → `task-1-bar-chart-band-7` → `how-long-task-1-vs-task-2` → `/ielts-task-1-checker`

### ChatGPT / trust cluster
- `is-chatgpt-accurate-ielts-writing` → `why-chatgpt-overestimates-ielts-band-scores` → `ultimate-chatgpt-prompt-ielts-task-2`
- `is-ai-ielts-tutoring-accurate` → `ai-tutor-vs-human-tutor` → `free-vs-paid-ielts-checker`

### Mock cluster
- `ielts-mock-writing-practice-guide` → `mock-exam-to-14-day-sprint` → `/ielts-mock-writing-test`

**Audit log:** `INTERNAL_LINK_AUDIT.md` (4 Aug 2026).

## Footer / nav (when approved)

- Blog link in Footer only (not Navbar — no design change to nav)
- Legal: Terms, Privacy, Cookies

## Anchor text guidelines

- Use descriptive anchors: "IELTS Task 2 checker" not "click here"
- Vary anchors; don't over-optimize exact match
- First mention of a concept links to the best page
