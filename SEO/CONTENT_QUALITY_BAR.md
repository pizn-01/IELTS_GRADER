# Content Quality Bar (B2 / B4) — Pre-Publish Gate

**Source of truth for shipping blog posts.** Full strategy context: [WEBSITE_SEO_ROADMAP.md](WEBSITE_SEO_ROADMAP.md) §§ B2–B4.

**Rule:** Velocity never beats this bar (Helpful Content risk). No `status: published` until the checklist passes.

Validate anytime:

```bash
python3 SEO/scripts/validate_blog_quality.py
python3 SEO/scripts/validate_blog_quality.py --strict   # fail on pending SERP/evidence
```

---

## Agent pre-publish checklist (mandatory)

Before setting `status: published`:

1. **SERP recon logged** in frontmatter `serpNotes` (see template below) — search the exact target query; note format of top 3, PAA questions, approximate word counts.
2. **B2 recipe:** keyword in title + first ~100 words + one H2; examiner-style teaching; **Try this yourself**; CTA → `/ielts-essay-checker`; ≥1 related cluster link; FAQ section on Q&A/myth/trust posts.
3. **B4 length** for type (Q&A 800–1,200 · guide 1,500–2,200 · comparison 1,500–2,500).
4. **Title ≤60** · **meta 150–160** · answer-first lead (Q&A: 40–55 words under H1).
5. **TOC with jump links** on posts >1,200 words (`## In this guide` → `#slug` anchors).
6. **Evidence note** in `evidenceNotes` — what is real vs illustrative; no fake lab studies.
7. **Anchor rotation** — vary CTA wording (not always “check your essay free”).
8. **Claims** — only language allowed by [CLAIMS.md](CLAIMS.md).
9. Run `python3 SEO/scripts/validate_blog_quality.py` — must exit 0.
10. **Human review** — set `qualityReviewed: pending` until You mark `ok` (see below).

Do **not** publish template-only clones. Unique examples required.

---

## Frontmatter fields (published posts)

```yaml
---
title: "…"                    # ≤60 chars, keyword front
slug: …
description: "…"              # 150–160 chars
keyword: …
type: qa | guide | trust | sample   # qa≈snippet; trust≈comparison
status: draft | published
publishedAt: YYYY-MM-DD
updatedAt: YYYY-MM-DD
author: IELTS AI Tutor Team
serpNotes: "Query: … | Top formats: … | PAA: … | Top3 words≈… | Recon: YYYY-MM-DD"
evidenceNotes: "Illustrative side-by-side / practice scores — not a multi-essay lab study. Screenshots: pending|attached"
qualityReviewed: pending | ok   # You set ok after human skim
---
```

`serpNotes` may start as a structured placeholder **only while `status: draft`**. Published posts need a real recon line (or `qualityReviewed: pending` is allowed temporarily, but `--strict` fails).

---

## You — what to do for posts already live

For every Wave A URL shipped so far, do this once (≈5–10 min/post):

### A. Indexing (today)
1. Confirm deploy includes the new slugs.
2. GSC → **URL Inspection** → **Request indexing** for each new URL (www only).
3. After deploy, regenerate/submit sitemap if needed: `sitemap.xml` already lists published posts.

**Priority index list (Wave A recent):**
- `/blog/improve-ielts-writing-band-7-to-8`
- `/blog/why-chatgpt-overestimates-ielts-band-scores`
- `/blog/ultimate-chatgpt-prompt-ielts-task-2`
- `/blog/is-chatgpt-accurate-ielts-writing`
- `/blog/best-essay-structure-ielts-task-2`
- `/blog/how-many-words-ielts-task-2`
- `/blog/how-many-paragraphs-ielts-essay`
- `/blog/can-you-use-idioms-ielts-writing`
- `/blog/can-i-use-i-ielts-academic-writing`
- `/blog/how-long-task-1-vs-task-2`
- `/blog/how-to-generate-ideas-ielts-task-2`
- `/blog/stuck-at-band-6-5-plateau`
- `/blog/band-6-vs-7-task-2`
- Also P0: `/`, `/ielts-essay-checker`, `/ielts-ai-tutor`, `/methodology`

### B. Human quality pass (this week)
For each post:
1. Google the **exact primary keyword** → fill/replace `serpNotes` (or reply to the agent with notes to patch).
2. Skim for wrong claims, awkward AI tone, broken links.
3. On comparison/ChatGPT posts: optionally paste one real essay into ChatGPT + our checker and send screenshots → agent embeds / updates `evidenceNotes`.
4. Set `qualityReviewed: ok` (or ask agent to) when done.

### C. Ongoing (weekly)
1. GSC Performance → pages with impressions but low CTR → title/meta only.
2. Positions 4–15 → deepen FAQ / internal links (roadmap C6).
3. Do **not** ask for 5 new posts in one day without SERP + review — HCU risk.

### D. Off-site (Week 3–4)
First mention of one trust post in a relevant community (value-first): see [guides/REDDIT.md](guides/REDDIT.md) / [EXTERNAL_CHECKLIST.md](EXTERNAL_CHECKLIST.md). Prefer linking the ChatGPT accuracy or overestimate post, not a hard sell.

---

## Length bands (reminder)

| Type | Words | Must include |
|------|-------|----------------|
| Q&A / snippet | 800–1,200 | 40–55 word answer under H1; table; 3–5 FAQs |
| Guide / how-to | 1,500–2,200 | Steps; before/after; criterion table; checklist |
| Comparison / trust | 1,500–2,500 | Honest side-by-side; methodology note; no fake studies |
| Sample / topic | 1,200–1,800 | Full essay; TR/CC/LR/GRA justification; try-it |

---

## Template

Use [blog/_TEMPLATE.md](blog/_TEMPLATE.md).
