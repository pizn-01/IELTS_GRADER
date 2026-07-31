# Website SEO Cadence — ieltsgrader.com only

**Product:** IELTS AI Tutor by IELTSGRADER  
**Canonical host:** `https://www.ieltsgrader.com` (apex `ieltsgrader.com` redirects to www)  
**GSC property:** use the **www** URL prefix — see [guides/GOOGLE_SEARCH_CONSOLE.md](guides/GOOGLE_SEARCH_CONSOLE.md)

Off-site promotion (Reddit, LinkedIn, Quora, YouTube, etc.) is covered in [social-media/](social-media/). **This guide is site-only.**

---

## North star

Maximize Google organic visibility and conversions to **free evaluation / signup** using owned URLs only:

1. Indexable content on winning keyword clusters  
2. Strong titles/meta (CTR)  
3. Internal links from blog → tool converters  
4. Healthy technical crawl (sitemap, indexing, CWV)  
5. Clear CTA on every P0 page  

Site quality is what Google ranks and what all other traffic lands on.

---

## Full URL inventory

Base: `https://www.ieltsgrader.com`

### Core / tools

| Path | Role |
|------|------|
| `/` | Homepage |
| `/pricing` | Plans |
| `/ielts-ai-tutor` | Pillar brand page |
| `/ielts-essay-checker` | Primary converter |
| `/ielts-task-1-checker` | Tool |
| `/ielts-task-2-checker` | Tool |
| `/ielts-writing-band-score` | Guide / tool |
| `/ielts-mock-writing-test` | Tool |
| `/grade-my-essay` | Entry alias |
| `/mock-exam` | Entry alias |

### Blog

| Path | Role |
|------|------|
| `/blog` | Blog index |

Published posts (`/blog/{slug}`):

1. `/blog/how-ielts-writing-is-scored`
2. `/blog/task-2-sample-band-6-education`
3. `/blog/band-6-vs-7-task-2`
4. `/blog/task-2-sample-band-7-technology`
5. `/blog/coherence-cohesion-14-day-plan`
6. `/blog/feedback-to-study-plan`
7. `/blog/task-1-trends-vocabulary`
8. `/blog/task-1-bar-chart-band-7`
9. `/blog/gt-formal-letter-checklist`
10. `/blog/gt-letter-sample-band-8-complaint`
11. `/blog/is-ai-ielts-tutoring-accurate`
12. `/blog/ai-tutor-vs-human-tutor`
13. `/blog/free-vs-paid-ielts-checker`
14. `/blog/ielts-mock-writing-practice-guide`
15. `/blog/task-2-sample-band-6-5-environment`
16. `/blog/task-2-opinion-essay-band-7-5`
17. `/blog/ielts-writing-error-taxonomy`
18. `/blog/dual-ai-grading-explained`
19. `/blog/task-response-vs-achievement`
20. `/blog/mock-exam-to-14-day-sprint`
21. `/blog/personalized-learning-editions-guide`
22. `/blog/academic-vs-general-training-writing`
23. `/blog/lexical-resource-band-6-to-7`
24. `/blog/handwritten-essay-ocr-tips`
25. `/blog/ielts-writing-practice-plans-explained`
26. `/blog/stuck-at-band-6-5-plateau`

Source files: `ielts-grader-app/src/content/blog/`. Sitemap regenerates from published frontmatter.

### Legal

| Path | Role |
|------|------|
| `/terms` | Terms |
| `/privacy` | Privacy |
| `/cookies` | Cookies |

### Never optimize for SEO (robots Disallow)

Do not invest crawl/index effort here:

`/dashboard`, `/report`, `/performance`, `/learning`, `/settings`, `/admin`, `/subscription`, `/upgrade`, `/analysis-ready`

See [TECHNICAL.md](TECHNICAL.md).

---

## Effort priority (on-site)

| Tier | URLs | Focus |
|------|------|--------|
| **P0** | `/`, `/ielts-essay-checker`, `/ielts-ai-tutor`, `/blog`, plus current top GSC click pages | Titles, CTAs, indexing, internal links |
| **P1** | Task 1/2 checkers, band score, mock test, `/grade-my-essay` | Depth, FAQ, links from blog |
| **P2** | Other blog posts, `/pricing`, legal | Accuracy, refresh when due; legal = accuracy only |

---

## Create vs improve (continuous work)

Two parallel streams — always running:

| Stream | Goal | Cadence |
|--------|------|---------|
| **Create** | New indexable URLs (mostly blog) that target keywords you do not own yet | ≥1 new post / week; 1–2 scored samples / week when capacity allows |
| **Improve** | Make existing URLs rank higher and convert better | Every Tue (titles) + Thu (links/FAQ) + monthly refresh |

**SEO impact (why both matter):**

| Activity | SEO impact |
|----------|------------|
| New blog posts (guides, samples, comparisons) | New queries → new impressions; long-tail capture; more internal-link targets into `/ielts-essay-checker` |
| Scored sample essays | High-intent long-tail (“band 7 sample …”); often strong conversion |
| Title / meta rewrites on existing pages | Higher CTR in SERPs without new URLs; compounds on pages that already have impressions |
| Deeper body content / FAQs on tool pages | Better relevance and dwell for head terms (essay checker, AI tutor) |
| Internal links blog → tools | Pass relevance to converters; help Google understand site structure |
| Sitemap + request indexing | Faster discovery of new/changed URLs |
| Refresh aging posts | Protect rankings; recover decaying CTR/position |
| Prune zero-impression after 90d | Reduce thin/duplicate crawl budget waste |

Do **not** create speaking/reading/leaked-test content ([KEYWORDS.md](KEYWORDS.md) negative keywords).

---

## How to create a new blog post

Source template: [blog/_TEMPLATE.md](blog/_TEMPLATE.md). Live files: `ielts-grader-app/src/content/blog/{slug}.md`.

### Step 1 — Pick the topic from keywords

1. Open [KEYWORDS.md](KEYWORDS.md) and GSC Queries (Mon scorecard).  
2. Prefer a keyword with **impressions but no strong page**, or a cluster that is already winning (double down).  
3. Choose type:

| Type | When to use | Typical length | SEO impact |
|------|-------------|----------------|------------|
| **Guide** | How-to / criteria / improvement plans | 900–1500 words | Mid/long-tail + trust |
| **Scored sample** | Task 1/2 or GT letter with band notes | Full essay + criterion notes | High long-tail + conversion |
| **Comparison** | AI vs human, free vs paid | 800–1200 words | Commercial / trust queries |

### Step 2 — Slug, title, meta

- Slug: lowercase, hyphens, primary keyword, no dates, ≤ ~60 chars.  
- Title: `[Primary keyword]: [Benefit] | IELTS AI Tutor` ([BRANDING.md](BRANDING.md)).  
- Description: 150–160 chars, keyword + benefit + soft CTA.  
- Frontmatter: `status: draft` until ready; then `published` + `publishedAt`.

### Step 3 — Write the body

1. H1 = primary keyword headline.  
2. Primary keyword in first ~100 words; lead with **IELTS AI Tutor** (SEO copy), IELTSGRADER secondary.  
3. Concrete teaching (examples, before/after, criteria) — not fluff.  
4. No banned claims (no “guaranteed band 7”, “100% accurate”, etc.).  
5. **Try it yourself** section → link `/ielts-essay-checker` and/or `/signup`.  
6. **Related reading** → ≥1 related `/blog/...` + optional `/ielts-ai-tutor`.  

### Step 4 — Internal links (required)

Every new post must include ([INTERNAL_LINKING.md](INTERNAL_LINKING.md)):

- Tool CTA → `/ielts-essay-checker` (or Task 1/2 checker if topic-specific)  
- ≥1 related blog post in the same cluster  
- Optional pillar → `/ielts-ai-tutor`  

### Step 5 — Ship

```bash
python3 SEO/scripts/validate_frontmatter.py
python3 SEO/scripts/generate_sitemap.py
```

Deploy → GSC URL Inspection → Request indexing → log on weekly scorecard.

---

## What to create constantly (ongoing backlog)

Prioritize in this order when choosing next Wed publish:

1. **Scored Task 2 samples** (education, tech, environment, opinion, etc.) — long-tail + conversion.  
2. **Scored Task 1 / GT letter samples** — same.  
3. **Band-improvement guides** (6→7, plateau, criteria deep-dives) — feeds P0 tool pages.  
4. **Trust / comparison** posts when GSC shows “AI IELTS” / “vs human” / “free vs paid” demand.  
5. **FAQ expansions as mini-posts** only if they cannot live as FAQ blocks on tool pages.

**Steady-state volume**

| Create continuously | Target |
|---------------------|--------|
| New published blog URL | ≥ **1 / week** |
| Scored samples among those | **1–2 / week** when capacity allows |
| New tool/landing URL | Rare — only for a clear P0 keyword with no page ([KEYWORDS.md](KEYWORDS.md)) |

Tool pages (`/ielts-essay-checker`, etc.) are mostly **improve**, not recreate.

---

## What to improve constantly (existing URLs)

### A. All P0 / P1 tool + home pages (continuous)

Rotate through: `/`, `/ielts-essay-checker`, `/ielts-ai-tutor`, Task 1/2, band score, mock, `/grade-my-essay`.

| Improve | How often | SEO impact |
|---------|-----------|------------|
| Title + meta description | Weekly (Tue) on low-CTR pages | CTR ↑ in SERP |
| H1 / intro clarity + primary keyword | When CTR or bounce weak | Relevance |
| FAQ blocks + FAQ schema | ≥1 tool page / month | Rich results + long-tail |
| Soft CTA above the fold | Whenever copy changes | Conversion (SEO traffic → eval) |
| Cross-links to sibling tools + 1 blog | Monthly link pass | Site structure / PageRank flow |
| Proof points (no banned claims) | As brand-approved | Trust / CTR |

Drafts for tool copy live under [pages/](pages/). FAQ backlog: [pages/faq-expansion.md](pages/faq-expansion.md).

### B. Existing blog posts (continuous)

| Improve | When | SEO impact |
|---------|------|------------|
| Title/meta rewrite | Impressions > 100 and CTR < 2% | CTR ↑ |
| Add/update examples, year, CTAs | Monthly on high-impression posts | Freshness / rankings |
| Add missing tool + related links | Thu weekly | Converter support |
| Merge/prune thin duplicates | Monthly if zero impressions 90d | Crawl efficiency |
| Expand short posts to 900+ words | When position stuck 8–20 | Depth / ranking |

### C. `/blog` index and `/pricing`

- Blog index: ensure new posts surface; clear path to tools.  
- Pricing: accurate plans; soft SEO — do not keyword-stuff; link from commercial-intent posts.

### D. Legal (`/terms`, `/privacy`, `/cookies`)

Accuracy and compliance only — not ranking projects.

---

## Map create/improve → weekly days

| Day | Create | Improve |
|-----|--------|---------|
| Mon | — | Measure (GSC); pick rewrite + next post topics |
| Tue | — | **Improve** titles/meta on 1–2 existing URLs |
| Wed | **Create** publish or finish new post | Or deepen one existing post if no new draft |
| Thu | — | **Improve** internal links + FAQ on existing tools/posts |
| Fri | Ship sitemap/index for anything created/improved | Confirm GSC request on changed URLs |

---

## Daily activities (~30–60 min when content work is active)

1. **GSC Page indexing** — Check new or “Discovered – currently not indexed” **P0** URLs; Request indexing if needed.  
2. **Draft progress** — If a post is mid-draft, write/edit toward publish ([blog/_TEMPLATE.md](blog/_TEMPLATE.md), [BRANDING.md](BRANDING.md)).  
3. **Live spot-check** — One URL: title, meta, H1, primary CTA to free eval / essay checker.  
4. **Internal link note** — One opportunity on a P0/P1 page ([INTERNAL_LINKING.md](INTERNAL_LINKING.md)).  

No social posting in this list.

---

## Weekly activities (Mon–Fri)

Aligned with [MEASUREMENT.md](MEASUREMENT.md) — **site-only** (no external activity row).

| Day | Focus |
|-----|--------|
| **Mon** | GSC scorecard: impressions, clicks, CTR, avg position, indexed count. Export Performance; optional `python3 SEO/scripts/gsc_summarize.py path/to/export.csv`. Fill low-CTR rewrite candidates (impressions > 100 and CTR < 2%). |
| **Tue** | Title/meta rewrite on 1–2 low-CTR **P0/P1** pages; ship. |
| **Wed** | Publish **or** deepen one blog post (target ≥1/week; 1–2 scored samples/week when capacity allows — [KEYWORDS.md](KEYWORDS.md)). Validate frontmatter. |
| **Thu** | Internal linking: new post ↔ hubs/tools; strengthen 2 cluster links. Optional FAQ/schema tick on one tool page ([pages/faq-expansion.md](pages/faq-expansion.md)). |
| **Fri** | Regen sitemap; deploy; Request indexing for new/changed URLs; close weekly scorecard Actions (site-only). |

### Ops commands

```bash
python3 SEO/scripts/validate_frontmatter.py
python3 SEO/scripts/generate_sitemap.py
```

Sitemap URL after deploy: `https://www.ieltsgrader.com/sitemap.xml`

---

## Monthly activities

1. **Cluster review** — Which keyword clusters gained? Which tool page converts best?  
2. **Plan 2 posts** (or major refreshes) in the winning cluster ([KEYWORDS.md](KEYWORDS.md)).  
3. **Refresh** aging high-impression posts (examples, CTAs, year mentions).  
4. **Prune / merge / noindex** candidates: zero-impression posts after **90 days** — document in [TRACKER.md](TRACKER.md).  
5. **Technical health** — Coverage report; PageSpeed/CWV on `/` and `/ielts-essay-checker`; confirm sitemap + prerender in prod ([TECHNICAL.md](TECHNICAL.md)).  
6. **Schema / FAQ** — Expand on one **P0** tool page.  
7. **Bing Webmaster** — Sitemap parity with GSC (site property only).  

---

## Post-publish checklist (every new or updated URL)

- [ ] Frontmatter valid (`status: published`, slug, title, description)  
- [ ] Internal links to ≥1 tool hub + related posts  
- [ ] Soft CTA to free eval / essay checker (no banned claims — [BRANDING.md](BRANDING.md))  
- [ ] `python3 SEO/scripts/generate_sitemap.py` + deploy  
- [ ] GSC URL Inspection → Request indexing  
- [ ] Add URL to weekly scorecard “New content published”  

---

## Weekly scorecard tear-off (site-only)

Copy each Monday. Full tables: [MEASUREMENT.md](MEASUREMENT.md).

**Week of:** ___________

| Metric | This week | Last week | Δ |
|--------|-----------|-----------|---|
| Total impressions | | | |
| Total clicks | | | |
| Average CTR | | | |
| Average position | | | |
| Indexed pages | | | |

**Actions this week (site-only)**

- [ ] GSC (+ Bing if due) checked  
- [ ] New content CREATED/published: ___________  
- [ ] Existing URLs IMPROVED (titles/meta/links): ___________  
- [ ] Internal links added to new posts  
- [ ] Sitemap regenerated + indexing requested for new URLs  

**Low-CTR rewrite candidates** (impressions > 100, CTR < 2%):

| URL | Impressions | CTR | Proposed new title |
|-----|-------------|-----|--------------------|
| | | | |

---

## Related docs

| Doc | Use |
|-----|-----|
| [MEASUREMENT.md](MEASUREMENT.md) | Full weekly KPI tables |
| [KEYWORDS.md](KEYWORDS.md) | Clusters → target URLs |
| [INTERNAL_LINKING.md](INTERNAL_LINKING.md) | Hub / tool / blog rules |
| [BRANDING.md](BRANDING.md) | Titles, meta, banned claims |
| [TECHNICAL.md](TECHNICAL.md) | Robots, sitemap, schema |
| [CONTENT_CALENDAR.md](CONTENT_CALENDAR.md) | Published post inventory |
| [guides/GOOGLE_SEARCH_CONSOLE.md](guides/GOOGLE_SEARCH_CONSOLE.md) | GSC setup |

PDF handout: [WEBSITE_SEO_CADENCE.pdf](WEBSITE_SEO_CADENCE.pdf) — regenerate with:

```bash
python3 SEO/scripts/generate_website_seo_cadence_pdf.py
```
