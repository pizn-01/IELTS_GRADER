# Website SEO Roadmap — ieltsgrader.com

**Status:** Published living roadmap  
**Product:** IELTS AI Tutor by IELTSGRADER  
**Canonical host:** `https://www.ieltsgrader.com`  
**Published:** 2026-08-03  
**Sources:** seo.docx · site inventory · weak-SEO diagnosis · flywheel · SEO-lead review  

**Companion docs:**
- Ops cadence (daily/weekly/monthly): [WEBSITE_SEO_CADENCE.md](WEBSITE_SEO_CADENCE.md) / [PDF](WEBSITE_SEO_CADENCE.pdf)
- Draft working notes that produced this: [WEBSITE_SEO_ROADMAP_PLAN.md](WEBSITE_SEO_ROADMAP_PLAN.md)
- Keywords: [KEYWORDS.md](KEYWORDS.md) · Calendar: [CONTENT_CALENDAR.md](CONTENT_CALENDAR.md) · Measurement: [MEASUREMENT.md](MEASUREMENT.md)

**This document owns:** strategy, per-URL improve map, create queues, quality bar, 12-week timeline, KPIs.  
**Cadence owns:** recurring Tue/Thu/Mon ops rituals.

---

## Lead summary (how we win)

We do **not** try to rank for “IELTS” or “IELTS Writing” head-on. We build **topical authority around IELTS Writing + AI evaluation**, then convert via a single product flywheel.

**North star:** Organic search → helpful content → try-it CTA → free band score → see weaknesses → practice again → subscription.

**Operating principle:** Fix **discovery & technical foundations** first (otherwise content never ranks), then **improve existing URLs** to exact search phrasing, then **create** Wave A→C content that always feeds the flywheel. Cadence doc (`WEBSITE_SEO_CADENCE.md`) remains weekly ops; this roadmap owns strategy + order.

**Speed levers (why we can outrank in weeks, not years):**
1. **Long-tail exact-match first** — Q&A posts (word count, paragraphs, idioms) index and rank fastest; front-load them
2. **Velocity** — 2–3 new URLs/week batch-produced + 2 improves/week (see Part E); a 1/week pace loses this market
3. **Snippet engineering** — every Q&A post answers in the first 40–55 words under the H1 → Position #0 steals clicks from bigger sites
4. **Unique data moat** — we grade real essays; publish data studies no competitor can copy (see D9)
5. **Instant indexing pipeline** — GSC request per URL + homepage "latest" links + Bing IndexNow (see E)

### Competitive reality (who we must beat, and how)

| Competitor type | Examples | Their weakness → our edge |
|-----------------|----------|---------------------------|
| Legacy teacher blogs | IELTS Liz, IELTS Advantage, IELTS Simon, ieltsbuddy | Static advice, no interactivity, aging content → we add live AI evaluation + fresh 2026 samples |
| Official orgs | IELTS.org, IDP, British Council | Generic, never target pain long-tail ("stuck at 6.5") → we own emotional long-tail |
| Direct AI checkers | Writing9 and similar essay-checker sites | Same product promise → we out-teach with examiner-style analysis + honest accuracy content + data studies |
| Generic AI content farms | Thin "ChatGPT for IELTS" listicles | No real examples → we differentiate with real scored essays and side-by-side band tests |

**SERP recon rule (mandatory before writing any post):** search the exact target query; record (a) what format ranks (listicle/guide/tool), (b) the PAA questions to answer, (c) word-count range of the top 3. Match format, beat depth, capture PAA. Log this in the post's frontmatter or a `serp-notes` comment.

## Part A — Diagnosis: why SEO is weak (general → our status)

Use this as the **priority filter** for every week. Content without foundation work is wasted.

### A1. General weak-SEO causes → IELTSGRADER status

| # | General cause | Our status (current) | Roadmap response |
|---|---------------|----------------------|------------------|
| 1 | Not indexed / not discovered | GSC/Bing verify + sitemap submit + indexing requests still **open** in `EXTERNAL_CHECKLIST.md` | **Week 0–1 gate:** www GSC → submit `sitemap.xml` → request index on P0 URLs |
| 2 | Thin / duplicate content | Phase 2 deepened posts; still gaps vs exact long-tail; tool pages must stay deep | Improve before inventing near-duplicates; one primary URL per intent |
| 3 | Wrong keywords (unwinnable head terms) | Docs correctly avoid speaking/reading/leaked tests; risk remains chasing “IELTS Writing” alone | Target long-tail + AI-checker intent; flywheel pages only |
| 4 | Weak titles / meta (low CTR) | Cadence has Tue title rewrites; not yet driven by live GSC data | Weekly scorecard → rewrite pages with impressions but low CTR |
| 5 | Poor internal linking | Rules exist in `INTERNAL_LINKING.md`; not all posts complete the flywheel block | Mandatory try-it → checker on every post; hub links from blog |
| 6 | SPA / JS crawl risk | Vite SPA; prerender via `build:prerender`; default Vercel `build` may ship thin shell | Confirm prod HTML for tools + blog; fix build if missing |
| 7 | Slow / bad CWV | PageSpeed / CWV still unchecked in `TECHNICAL.md` | Week 1–2 CWV pass on P0; trim shared-bundle drag on marketing routes |
| 8 | No topical authority | 26 posts; missing essay-type cluster + health/gov/work topics + Band 9 hubs | Waves B–C build clusters, not random one-offs |
| 9 | Zero / weak off-site signals | Reddit, directories, Product Hunt, YouTube still remaining | Parallel track (not instead of on-site): 1 channel/week after Week 2 |
| 10 | Stale content | Monthly refresh called out; Tier-1 not yet on a named refresh list | Refresh Tier-1 monthly with new samples / 2026 freshness |
| 11 | Trust / E-E-A-T gaps | Unverified “10k / 4.9” claims; social URLs incomplete | Soften or prove claims; real social URLs; honest AI-accuracy content |
| 12 | Keyword cannibalization | `/`, checker, AI tutor, trust posts can overlap | Assign **one primary URL** per head commercial query |
| 13 | Wrong host / canonical | Strategy = www; some docs/robots historically referenced apex | Single GSC property = www; sitemap + canonicals all www |
| 14 | No measurement loop | Scorecard doc exists; weekly GSC loop not running | Mon scorecard is non-negotiable from Week 1 |

### A2. Platform-specific risk register (keep working until closed)

**Critical**
1. GSC www not verified; sitemap not submitted; P0 not requested for indexing  
2. Prod prerender not guaranteed on every deploy  
3. www vs apex inconsistency in tooling/docs  
4. No weekly GSC → title rewrite loop  

**On-page / content**
5. Missing Wave A long-tail (ChatGPT accuracy, word count, structure, 6.5→7 exact match)  
6. Existing posts not titled to exact search phrasing  
7. Tool landings under-compete head commercial terms without FAQ depth + CTAs  
8. Incomplete flywheel block on sample posts (analysis → try it → checker)  
9. Incomplete topic clusters (health / government / work; Band 9 hubs)  
10. Possible cannibalization across homepage / checker / AI tutor  
11. Sitemap generator drift (`/features`, `/sample-report` vs `generate_sitemap.py`)  

**Technical**
12. FAQPage schema not systematic on Q&A posts  
13. CWV unchecked on P0  
14. OG/social previews historically incomplete (affects distribution CTR)  

**Trust & off-site**
15. Unverified social-proof claims  
16. Incomplete real social profiles in footer  
17. Thin backlink / community program  

**Process**
18. Create vs improve imbalance (shipping posts without refreshing P0)  
19. ~~Roadmap not yet published~~ — **done** (`WEBSITE_SEO_ROADMAP.md` + PDF live)
20. Scope creep into negative-keyword topics  

**Added by SEO-lead review (2026-08-03)**
21. **Scaled-content / Helpful Content risk** — publishing many AI-drafted posts fast can trigger quality demotion sitewide. Guard: every post passes the B4 quality bar (unique examples, real scored essays, human review) before publish; never ship template-only text  
22. **No E-E-A-T program** — no author bylines, no methodology page, no visible last-updated dates (see B4 fixes)  
23. **No SERP recon step** — writing without checking live SERP format/PAA wastes posts (fixed: recon rule above)  
24. **Over-optimized internal anchors** — repeating "check your essay with AI" sitewide looks manipulative; rotate 4–5 natural variants  
25. **Wave C programmatic thinness** — 6 near-identical topic pages risk duplicate-pattern demotion; each needs a unique question, unique sample, unique analysis (never one template with swapped nouns)  
26. **No time-to-index tracking** — if posts take >7 days to index, foundation is still broken and content velocity is wasted (KPI added in F)  
27. **Publishing velocity too low** — ≥1/week ≈ 12 URLs/quarter vs the ~30-URL target; corrected in Part E  
28. **No competitor rank tracking** — we can't claim "better than everyone" without tracking who holds our target SERPs (added in F)  

---

## Part B — The flywheel (center of strategy)

Every URL, title, internal link, and CTA exists to move a user one step on this loop.

```text
Google search (exact long-tail / AI-IELTS intent)
  → Helpful IELTS article (guide, Q&A, or sample)
  → Sample essay + examiner-style analysis (criteria table)
  → "Try this question yourself" CTA
  → /ielts-essay-checker (primary converter)
  → Free band score + criterion weaknesses
  → Practice another essay / mock / study plan
  → Subscription
```

### B1. Flywheel roles by URL type

| Role | URLs | Job |
|------|------|-----|
| **Attract** | Blog guides, Q&A, topic samples | Rank for questions people type; earn trust |
| **Prove** | Scored samples, Band 6 vs 7, error taxonomy, sample-report | Show examiner-style depth competitors lack |
| **Convert** | `/ielts-essay-checker`, `/grade-my-essay`, Task 1/2 checkers | Free eval CTA; highest commercial intent |
| **Orient** | `/ielts-ai-tutor`, `/features`, `/` | Explain product; secondary for brand queries |
| **Deepen** | `/ielts-mock-writing-test`, `/ielts-writing-band-score`, practice-plan posts | Exam realism + score literacy → retention |
| **Monetize** | `/pricing` | Soft link from converters; not primary SEO chase |
| **Trust only** | Legal, honest AI-accuracy posts | Reduce bounce / compliance; support E-E-A-T |

### B2. Non-negotiable page recipe (encode in published roadmap)

Every **Attract / Prove** page must include:
1. Exact primary keyword in title, first ~100 words, one H2  
2. Examiner-style teaching (criteria, before/after, or annotated sample) — not generic tips  
3. **Try this yourself** block with the prompt (or a close prompt)  
4. Primary CTA → `/ielts-essay-checker` (or Task 1/2 checker if topic-specific)  
5. ≥1 related blog link in the same cluster  
6. Optional pillar → `/ielts-ai-tutor`  
7. FAQ section + FAQPage JSON-LD on Q&A / myth-busting posts  
8. Soft secondary CTA → signup / free evaluation wording per `BRANDING.md`  

**Differentiation vs classic IELTS sites:**  
Competitors: Question → Band 9 sample → vocabulary  
Us: Question → Band sample → **examiner-style analysis** → **AI evaluation CTA** → try it yourself  

### B3. Primary URL ownership (anti-cannibalization)

| Intent | Primary URL | Others support via links |
|--------|-------------|---------------------------|
| IELTS essay checker / check my essay | `/ielts-essay-checker` | `/`, `/grade-my-essay`, blog CTAs |
| IELTS AI tutor | `/ielts-ai-tutor` | `/features`, trust posts |
| Band score explained / calculated | `/ielts-writing-band-score` + `how-ielts-writing-is-scored` | checker FAQ |
| Task 2 checker | `/ielts-task-2-checker` | Task 2 blog cluster |
| Task 1 checker | `/ielts-task-1-checker` | Task 1 blog cluster |
| Mock writing test | `/ielts-mock-writing-test` | mock practice guide |
| Stuck at 6.5 / 6.5→7 | plateau post (+ Wave A sibling only if needed) | band-6-vs-7, lexical, CC plan |

### B4. Content quality bar (every post — length, title, structure, E-E-A-T)

This is what "far better than everyone" means at page level. No post ships below this bar.

**Length + depth by type (match SERP recon, then beat top 3 on depth, not padding):**

| Type | Length | Must contain |
|------|--------|--------------|
| Q&A / snippet post (word count, paragraphs, idioms) | 800–1,200 words | Direct 40–55 word answer immediately under H1; one summary table; 3–5 PAA-matched FAQs |
| Guide / how-to (6.5→7, structure, criteria) | 1,500–2,200 words | Step framework; before/after essay excerpts; criterion table; checklist |
| Scored sample / topic page | 1,200–1,800 words | Full essay; TR/CC/LR/GRA scores each with 2–3 sentence justification; annotated fixes; "try this prompt" block |
| Comparison / trust (ChatGPT vs us, best AI tools) | 1,500–2,500 words | Honest side-by-side test with real essay + real scores; screenshots; methodology note |
| Pillar / hub (essay types, Task 1 vs 2) | 2,000–3,000 words | Section per subtype linking to each template post; jump-link TOC |

**Title rules (CTR engineering):**
- ≤60 characters, exact keyword at the front
- Use one CTR modifier where honest: number ("Top 10"), bracket ("(Official Rules)", "(2026 Test)"), outcome ("…That Actually Raise Your Score")
- Never clickbait a promise the post doesn't keep — CTR + fast pogo-back is a net negative
- Meta description 150–160 chars: keyword + concrete benefit + soft CTA ("Check your essay free")

**Structure rules (dwell + snippet):**
- TOC with jump links on every post >1,200 words
- H2s phrased as the PAA questions found in SERP recon
- Paragraphs ≤3 sentences; one table or list per screen of content
- At least one visual per post (criterion score table, chart for Task 1 posts, before/after box) with keyword-relevant alt text
- Answer-first: conclusion/answer at top, explanation after — never bury the answer

**E-E-A-T program (site-wide, Week 1–2):**
- Named author byline + short credential blurb on every post; one author profile page linked from all posts
- "How we grade" methodology page: dual-AI grading, alignment with public IELTS band descriptors (link to official descriptors), limitations stated honestly
- Visible "Last updated: {date}" on every post + `dateModified` in Article JSON-LD
- Every score/claim in comparison posts backed by a shown example — screenshots or embedded reports
- Breadcrumbs + BreadcrumbList schema; Organization schema with real social profile `sameAs` links

**Internal anchor rotation (anti-over-optimization):**
Rotate: "check your essay with AI" · "get your band score free" · "try the IELTS essay checker" · "see how your essay scores" · plain URL mentions.

---

## Part C — Improve existing URLs (enhanced from seo.docx)

Base: `https://www.ieltsgrader.com`. Rule from docx: **improve before creating a near-duplicate**; use exact search phrasing in title / first 100 words / one H2; every page ends in the flywheel CTA.

### C1. Cluster strategy (all live URL types)

| Cluster | URLs | Strategy (docx-aligned) |
|---------|------|-------------------------|
| **P0 converters** | `/`, `/ielts-essay-checker`, `/ielts-ai-tutor` | Own commercial intent; FAQ + FAQPage; free-eval CTA; receive links from all posts |
| **P1 tools** | Task 1/2 checkers, band-score, mock, `/grade-my-essay`, `/mock-exam` | Deepen to `SEO/pages/*.md`; FAQ schema; aliases support converters |
| **Support** | `/pricing`, `/features`, `/sample-report`, `/blog` | Unique meta; blog = cluster hub; sample-report on AI/trust posts |
| **Blog (26)** | `/blog/{slug}` | Full UPDATE matrix below |
| **Legal** | terms/privacy/cookies | Accuracy only |
| **Never SEO** | app chrome (dashboard, etc.) | robots Disallow |

### C2. Docx "First 10" → map to EXISTING tool/landing URLs (improve these first)

These are the commercial/informational pillars the docx says to ship in Week 1–2. Prefer **update live URLs** over new thin landings.

| # | Docx target title / job | Live URL to improve | Exact improve actions |
|---|-------------------------|---------------------|----------------------|
| 1 | **IELTS Writing Checker: Check Your Essay & Get a Band Score** | `/ielts-essay-checker` | Title/H1 to exact commercial phrase; FAQ (Can AI check my essay?); embed/deep-link free eval; FAQPage schema; link from all posts with anchors like "check your essay with AI" |
| 2 | **How to Get Band 7 in IELTS Writing** (informational pillar) | Prefer UPDATE `stuck-at-band-6-5-plateau` + `band-6-vs-7-task-2`; CREATE only if GSC shows gap | Exact "how to get / move to Band 7"; link → checker + essay types |
| 3 | **How to Improve IELTS Writing from Band 6 to 7** | `stuck-at-band-6-5-plateau` | Titles: "Why Am I Stuck at 6.5…" + "Improve from 6.5 to 7"; problem+fix format; monthly fresh sample |
| 4 | **Task 2: How to Structure a Band 7+ Essay** | CREATE Wave A (no live structure hub) — until then strengthen `task-2-opinion-essay-band-7-5` with structure section + links | Link to Band 7 pillar, checker, future essay-types hub |
| 5 | **IELTS Writing Band Score Calculator** | `/ielts-writing-band-score` + `how-ielts-writing-is-scored` | Tool+explainer: calculator/formula intent; "How IELTS writing scores are calculated"; HowTo/FAQ schema |
| 6 | **Task 2 Essay Types** (opinion, discussion, adv/dis, problem/solution, two-part) | CREATE hub + Wave B templates; bridge from `task-2-opinion-essay-band-7-5` | Opinion post gets "essay types" related links |
| 7 | **How to Improve Task Response** | `task-response-vs-achievement` + CREATE TR deep-dive if thin | Rubric-mapped; "Task Response common mistakes" |
| 8 | **How to Improve Coherence and Cohesion** | `coherence-cohesion-14-day-plan` | Retitle toward "Band 7+ without overusing linking words"; PAA/snippet table |
| 9 | **IELTS Writing Vocabulary for Band 7+** | `lexical-resource-band-6-to-7` | "Lexical Resource masterclass / mistakes that drop your score"; later split by topic |
| 10 | **Common Grammar Mistakes in IELTS Writing** | `ielts-writing-error-taxonomy` + CREATE GRA Top 10 if needed | Cap-at-6.5 angle; "how AI catches them" feature highlight → checker |

### C3. Existing-post UPDATE matrix (keyword + title + intent)

| Live slug | Primary keyword (docx) | Target title / H1 to win | Intent / snippet angle | Flywheel CTA |
|-----------|------------------------|--------------------------|------------------------|--------------|
| `stuck-at-band-6-5-plateau` | why am I stuck at 6.5; improve 6.5 to 7 | Why Am I Stuck at 6.5 in IELTS Writing? / How to Improve from 6.5 to 7 (2026) | Emotional + #1 bottleneck; problem+fix | checker |
| `band-6-vs-7-task-2` | difference between band 6 and 7 IELTS writing | Difference Between Band 6 and Band 7 IELTS Writing | Comparison = high CTR; snippet table | checker |
| `how-ielts-writing-is-scored` | how is ielts writing band score calculated | How IELTS Writing Scores Are Calculated (Official Formula Explained) | Algorithm / PAA; clear formula | band-score + checker |
| `is-ai-ielts-tutoring-accurate` | is chatgpt accurate for ielts writing; can AI predict band | Is ChatGPT Accurate… (or sibling); Can AI accurately predict your band? | Commercial/investigative; side-by-side scores; FAQ schema | checker + sample-report |
| `coherence-cohesion-14-day-plan` | ielts coherence and cohesion band 7 descriptors | Coherence & Cohesion: Score Band 7+ Without Overusing Linking Words | PAA; misconception fix | checker |
| `lexical-resource-band-6-to-7` | lexical resource ielts writing task 2; improve lexical resource | Lexical Resource Masterclass: Vocabulary Mistakes That Drop Your Score | Error-based / high CTR | checker |
| `task-1-bar-chart-band-7` | ielts writing task 1 academic bar chart; overview examples | How to Describe Charts & Graphs… + Overview Examples | Visual search; overview formulas | Task 1 checker |
| `ielts-writing-error-taxonomy` | common mistakes task 1 / task 2; grammar cap at 6.5 | Common Mistakes in IELTS Writing Task 1 & Task 2 | Problem-solving listicle | checker |
| `task-response-vs-achievement` | task response common mistakes; fix weak Task Achievement | How to Fix Weak Task Response / Task Achievement | Rubric; biggest score-limiter | Task 2 checker |
| `task-2-opinion-essay-band-7-5` | to what extent / opinion structure | Bridge to Agree/Disagree template hub | Template search | Task 2 checker |
| `task-2-sample-band-6-education` | education essay topics + samples | Retitle toward Education Topics + Band sample; add full flywheel block | Topic long-tail | checker |
| `task-2-sample-band-7-technology` | technology vocabulary / topics | Technology Topics + Band 7/9 path; examiner analysis → try it | Topic long-tail | checker |
| `task-2-sample-band-6-5-environment` | environment essay ideas and vocabulary | Environment ideas + collocations + try it | Idea-block | checker |
| `gt-formal-letter-checklist` | formal letter structure GT task 1 | Formal vs Informal openings bridge | GT volume | Task 1 checker |
| `gt-letter-sample-band-8-complaint` | GT letter sample | Examiner annotation + try it yourself | Sample CTR | Task 1 checker |
| `ai-tutor-vs-human-tutor` | can AI replace a human IELTS tutor | Debate/comparison table; honest nuance | Trust + backlinks | AI tutor + checker |
| `free-vs-paid-ielts-checker` | best ai for ielts writing correction (support) | Commercial comparison → our checker | High CPC support | checker + pricing |
| `dual-ai-grading-explained` | AI evaluation trust | Link sample-report; why specialized > ChatGPT | Trust | checker |
| `task-1-trends-vocabulary` | describe graphs without repeating phrases | Expand "without repeating phrases" section | Task 1 underserved | Task 1 checker |
| `ielts-mock-writing-practice-guide` | time management / practice volume | Tie to how long on Task 1 vs 2 + practice essays/week | Exam strategy | mock test |
| Remaining product posts (`feedback-to-study-plan`, `mock-exam-to-14-day-sprint`, `personalized-learning-editions-guide`, `academic-vs-general-training-writing`, `handwritten-essay-ocr-tips`, `ielts-writing-practice-plans-explained`) | product/education support | Keep accurate; add checker/mock CTAs; don't chase head terms | Assist flywheel retention | matching tool |

### C4. Question-cluster → UPDATE vs CREATE (docx Reddit-style questions)

| User asks… | Target title | Action |
|------------|--------------|--------|
| Can you check my IELTS essay? | Can AI Check My IELTS Essay? | **UPDATE** `/ielts-essay-checker` FAQ + optional short blog |
| What band is my essay? | How to Check Your IELTS Writing Band Score | **UPDATE** `/ielts-writing-band-score` + scoring post |
| Why am I getting 6? | Why Am I Stuck at Band 6 / 6.5… | **UPDATE** plateau post |
| How do I get 7? | How to Get Band 7 in IELTS Writing | **UPDATE** plateau / band-6-vs-7; CREATE pillar only if needed |
| How many words? | How Many Words Should You Write in Task 2? | **CREATE** Wave A |
| How many paragraphs? | How Many Paragraphs Should an IELTS Essay Have? | **CREATE** Wave A |
| What should I write? | How to Generate Ideas for Task 2 | **CREATE** Wave A |

### C5. Fast-ranking / improve tactics (docx — apply on every UPDATE)

- Listicle or **problem + fix** (snippets beat narrative)
- Exact phrasing test-takers type ("why is my ielts score stuck at 6")
- Interlink → `/ielts-essay-checker` (anchors: "check your essay with AI", "try our automated IELTS grader")
- Monthly refresh Tier-1 with **fresh sample essays**
- Add "2026" or "with Examples" where it lifts CTR
- FAQPage / HowTo JSON-LD on Q&A and formula pages
- Embed or deep-link **live checker** on AI comparison / accuracy posts (dwell)
- Topic posts (#13–16 matrix) always link back to primary tool landing

### C6. GSC decision rules (weekly triage — removes guesswork)

Run every Monday against the scorecard; act Tuesday/Thursday:

| Signal (per URL/query) | Action |
|------------------------|--------|
| Impressions > 100/wk, position 4–15 | **Improve now:** retitle to exact query, add answer-first block + FAQ, add 2 internal links from high-traffic pages — highest ROI action in SEO |
| Impressions > 100/wk, position 1–3, CTR below expected | Rewrite title/meta only (CTR modifiers); don't touch body |
| Ranking page ≠ intended primary URL (cannibalization) | 301/canonical or de-optimize the wrong page; strengthen the primary |
| New post 0 impressions after 14 days | Check indexed status; re-request; add homepage/hub link; if not indexed by day 21, investigate prerender/canonical |
| Post 0 impressions at 90 days | Merge into a stronger sibling or rewrite around a new query; never leave thin orphans |
| Query with impressions but **no** dedicated page | Add to next week's create queue (beats any pre-planned topic — real demand data wins) |

---

## Part D — Create hot topics (enhanced from seo.docx)

Deduplicated against 26 live posts. Prefer **UPDATE** (Part C) when a live URL can own the query.
**First-30 mix (docx):** 10 commercial/problem · 10 writing-skill · 10 topic/sample-answer.

### D1. Priority ladder (docx Tiers 1–4)

| Tier | When | Topics (all retained) |
|------|------|------------------------|
| **1 — Publish first** | Low competition, buyer intent, weeks | Why does my essay always score Band 6?; Most overused words + Band 7 alternatives; Common grammar mistakes that cap you at 6.5; Best AI prompts for accurate IELTS feedback; Can AI accurately predict your band score? |
| **2 — Next** | Moderate competition, strong long-tail | Fix weak Task Achievement; Linking words that actually improve score (vs overused); Band 7+ vocabulary by topic (env/tech/edu/health — split later); Self-editing checklist; Describe graphs/charts without repeating phrases |
| **3 — Trust/conversion** | Slower rank, high convert | ChatGPT vs IELTSGRADER vs real examiner; Can AI replace a human tutor?; Real Band 9 samples with examiner-style annotation |
| **4 — Pillars** | Authority + internal links | Task 1 vs Task 2 differences; Essay structures by question type; Time management Task 2 in 40 minutes; Paraphrasing for introductions; How many practice essays per week; How to get useful AI feedback (prompt eng); Sample Band 9 Task 1 walkthrough |

### D2. Top 20 SEO matrix (keyword + title + intent) — CREATE unless Part C owns it

| # | Primary keyword | High-ranking title (use this) | Intent / snippet | Action |
|---|-----------------|-------------------------------|------------------|--------|
| 1 | is chatgpt accurate for ielts writing | Is ChatGPT Accurate for IELTS Writing? (Band Score Comparison Test) | Side-by-side band discrepancies; FAQ schema | CREATE (or expand AI accuracy post) |
| 2 | best ai for ielts writing correction | The 5 Best AI Tools for IELTS Essay Checking in 2026 | Listicle / high CPC; position us naturally | CREATE |
| 3 | chatgpt ielts band score accuracy | Why ChatGPT Overestimates IELTS Band Scores (And How to Fix It) | Band 6.5 score-loop; embed checker | CREATE |
| 4 | chatgpt prompt for ielts writing task 2 | The Ultimate ChatGPT Prompt for IELTS Task 2 Essay Evaluation | Copy-paste intent; FAQ schema | CREATE |
| 5 | how to get band 7 in ielts writing task 2 | How to Move from Band 6.5 to 7.0 in IELTS Writing Task 2 | #1 bottleneck | UPDATE plateau first; CREATE if gap |
| 6 | ielts coherence and cohesion band 7 descriptors | Coherence & Cohesion: How to Score Band 7+ Without Overusing Linking Words | PAA | UPDATE CC plan |
| 7 | lexical resource ielts writing task 2 | Lexical Resource Masterclass: Common Vocabulary Mistakes That Drop Your Score | Error CTR | UPDATE lexical post |
| 8 | grammatical range and accuracy ielts | Top 10 Grammatical Errors in IELTS Essays (And How AI Catches Them) | Feature → product | CREATE or deepen error taxonomy |
| 9 | to what extent do you agree or disagree ielts structure | To What Extent Do You Agree IELTS Essays: Band 8 Template & Examples | Essay sub-type pillar | CREATE |
| 10 | discuss both views ielts essay format | How to Structure a Discuss Both Views Essay for Band 7.5+ | Template | CREATE |
| 11 | ielts advantage disadvantage essay structure | Advantage & Disadvantage Essays: The 4-Paragraph Formula That Works | Fast rank; structure tables | CREATE |
| 12 | ielts writing task 1 academic bar chart description | How to Describe Charts & Graphs in IELTS Academic Task 1 | Overview formulas | UPDATE bar-chart + CREATE overview hub if needed |
| 13 | ielts writing topics technology vocabulary | IELTS Vocabulary: Advanced Collocations for Technology Topics | Topic cluster | CREATE (sample exists — vocab sibling) |
| 14 | ielts environment essay ideas and vocabulary | How to Generate Ideas for Environment Essays in IELTS Task 2 | Idea-block | UPDATE env sample and/or CREATE |
| 15 | ielts writing education topic essay prompts | Mastering Education Prompts: Model Answers & Vocabulary | Content hub | UPDATE edu sample and/or CREATE |
| 16 | formal letter structure ielts general task 1 | GT Task 1: Formal vs Informal Letter Openings & Closings | GT volume | CREATE (bridge from checklist) |
| 17 | ielts writing task 2 word count penalty | Is There a Word Limit Penalty in IELTS Writing Task 2? | Position #0 snippet; FAQ | CREATE |
| 18 | can you use idioms in ielts writing | Can You Use Idioms in IELTS Writing Task 2? (Official Rules) | Myth-bust; FAQ | CREATE |
| 19 | how many paragraphs in ielts writing task 2 | How Many Paragraphs Should You Write in IELTS Task 2? | Numbered summary snippet | CREATE |
| 20 | how is ielts writing band score calculated | How IELTS Writing Scores Are Calculated (Official Formula Explained) | Formula | UPDATE scoring post |

**Schema priority (docx):** FAQPage on matrix #1, #4, #17, #18. Live AI demo / deep-link on #1 and #3. Topic #13–16 → checker anchors.

### D3. SEO-maximized "rank fastest" titles (exact phrases — ship order)

Use as titles or very close variations. Star = often UPDATE existing.

1. How to Improve IELTS Writing from 6.5 to 7 ★
2. How to Improve IELTS Writing from 7 to 8
3. Is ChatGPT Accurate for IELTS Writing Score?
4. Best Essay Structure for IELTS Writing Task 2
5. How Many Words for IELTS Writing Task 2
6. IELTS Writing Task 1 Overview Examples
7. Common Mistakes in IELTS Writing Task 1
8. Common Mistakes in IELTS Writing Task 2 ★ (error taxonomy)
9. How to Write IELTS Writing Task 2 Introduction
10. Can I Use "I" in IELTS Academic Writing Task 2?
11. How to Improve Lexical Resource in IELTS Writing ★
12. Best Linking Words for IELTS Writing Task 2
13. How Long Should I Spend on IELTS Writing Task 1 and Task 2
14. Why Am I Stuck at 6.5 in IELTS Writing ★
15. How to Generate Ideas for IELTS Writing Task 2
16. IELTS Writing Task 2 Band 9 Sample Essays
17. Difference Between Band 6 and Band 7 IELTS Writing ★
18. How to Use ChatGPT for IELTS Writing Practice
19. Formal vs Informal Letter IELTS General Training Task 1
20. IELTS Writing Task Response Common Mistakes ★

**Ship-first five (docx):** 6.5→7 · 7→8 · ChatGPT accuracy · Best Task 2 structure · How many words.

### D4. Wave A — CREATE queue (high-intent / fast rank)

1. How to Improve IELTS Writing from 6.5 to 7 *(only if plateau cannot fully own)*
2. How to Improve IELTS Writing from 7 to 8
3. Is ChatGPT Accurate for IELTS Writing Score? (Band Score Comparison Test)
4. Best Essay Structure for IELTS Writing Task 2
5. How Many Words / Word Limit Penalty for Task 2 *(can be one post with two H2s or two posts)*
6. Why ChatGPT Overestimates IELTS Band Scores
7. Ultimate ChatGPT Prompt for IELTS Task 2 Evaluation
8. Best AI Tools for IELTS Essay Checking (2026)
9. How Many Paragraphs in IELTS Task 2
10. Can You Use Idioms in IELTS Writing?
11. Can I Use "I" in IELTS Academic Writing Task 2?
12. How Long Should I Spend on Task 1 vs Task 2 (+ time management in 40 minutes)
13. How to Generate Ideas for IELTS Writing Task 2
14. Best Linking Words for Task 2 (that actually improve score vs overused)
15. How to Use ChatGPT for IELTS Writing Practice
16. Why Does My IELTS Essay Always Score Band 6?
17. Most Overused Words in IELTS Essays + Band 7 Alternatives
18. Can AI Check My IELTS Essay? *(short; or FAQ-only on checker)*

### D5. Wave B — CREATE queue (criteria + essay types + skills)

19. How to Improve / Fix Weak Task Response & Task Achievement
20. Top 10 Grammatical Errors AI Catches (cap at 6.5)
21. To What Extent Do You Agree Band 8 Template
22. Discuss Both Views Structure for Band 7.5+
23. Advantage & Disadvantage 4-Paragraph Formula
24. Problem-Solution Essay Structure
25. Two-Part Question Essay Structure
26. Task 2 Essay Types hub (links all five types)
27. How to Write a Task 2 Introduction (paraphrasing techniques)
28. Self-Editing Checklist Before Submitting
29. Task 1 Overview Examples (dedicated)
30. Common Mistakes in Task 1 / charts without repeating phrases
31. GT Formal vs Informal Letter Openings & Closings
32. Task 1 vs Task 2: Full Differences Guide
33. Body Paragraphs + Conclusion structures (pillar support)
34. How to Get Useful AI Feedback (prompt engineering guide) — may merge with #7

### D6. Wave C — Topic / Band 9 sample flywheel pages

Format (docx differentiation):
**Question → Band 9 sample → Examiner-style analysis (TR/CC/LR/GRA scores) → Try it yourself → AI band score**

| Theme | Title pattern |
|-------|----------------|
| Education | IELTS Education Essay Topics + Band 9 Sample Answers |
| Technology | IELTS Technology Essay Topics + Band 9 Sample Answers |
| Environment | IELTS Environment Essay Topics + Band 9 Sample Answers |
| Health | IELTS Health Essay Topics + Band 9 Sample Answers |
| Government | IELTS Government Essay Topics + Band 9 Sample Answers |
| Work | IELTS Work Essay Topics + Band 9 Sample Answers |

Plus:
- IELTS Writing Task 2 Band 9 Sample Essays (annotated hub)
- Sample Band 9 Task 1 report walkthrough
- Band 7+ vocabulary by topic (env/tech/edu/health) — split posts later
- Upgrade existing edu/tech/env samples to this full flywheel format first before net-new themes

### D7. Capacity backlog (still retained)

- ChatGPT vs IELTSGRADER vs a real examiner
- Can AI replace a human IELTS tutor? → strengthen `ai-tutor-vs-human-tutor` first
- How many practice essays per week actually move your score
- Band 8 / Band 9 dedicated improvement posts beyond 7→8

### D8. Authority tree + create rules

```text
IELTS Writing
├── IELTS Writing Checker → /ielts-essay-checker
├── IELTS Writing Band Score → Band 6 / 6.5 / 7 / 8 / 9
├── IELTS Writing Task 2 → Structure / Types / Intro / Body / Conclusion
├── IELTS Writing Criteria → TR · CC · LR · GRA
├── IELTS Writing Topics → Edu · Tech · Env · Health · Gov · Work
└── AI IELTS Writing → AI Essay Checker · ChatGPT vs us · Best AI checkers
```

**Every new post:** exact keyword in title, first ~100 words, one H2; flywheel CTA to checker; related cluster link; FAQ schema on Q&A; freshness modifier where useful; passes B4 quality bar; SERP recon logged.
**Target ~30 net new/improved URLs in 12 weeks** (mix of UPDATES + CREATES, not 30 net-new only).

### D9. Data moat + link magnets (our unfair advantage — start Week 3)

No IELTS blog can copy this: we grade real essays at scale. This is the fastest path to backlinks + authority on a new domain.

**Data studies (publish 1 per month; pitch to Reddit/IELTS communities/education press):**
1. "We analyzed {N} IELTS essays: the 10 mistakes that cap scores at Band 6" — anonymized, aggregated grading data
2. "ChatGPT vs specialized AI vs examiner: we scored the same 50 essays with all three" — the definitive accuracy study (feeds D2 #1 and #3)
3. "How long does it take to go from 6.5 to 7? Data from {N} students" — progress data
4. "Most overused words in real IELTS essays" — upgrade the Tier-1 listicle with actual corpus data instead of generic lists

**Free interactive tools (rank for tool intent + earn passive links):**
- Band score calculator widget on `/ielts-writing-band-score` (docx explicitly calls for a real calculator, not just an article)
- Task 2 word counter with instant under/over-length warning (embeds in word-count post)
- Both link-worthy, both feed the checker CTA

**Guardrail:** anonymize and aggregate all user data; state methodology on each study.

---

## Part E — 12-week timeline (foundation → flywheel → authority)

Foundation work is **Week 0–2**, not optional. Content without indexing/prerender is invisible.

| Weeks | Focus | Ship | Progress (as of 3 Aug 2026) |
|-------|--------|------|------------------------------|
| **0–1** | **Foundation gate** | Verify GSC **www**; submit sitemap; request indexing for `/`, `/ielts-essay-checker`, `/ielts-ai-tutor`, `/blog`, top posts; confirm prod prerender HTML; align robots/sitemap/canonicals to www; fix sitemap generator drift (`/features`, `/sample-report`); Bing Webmaster (import from GSC) + IndexNow; start Mon GSC scorecard | **Done** on-site; GSC/Bing requests remain **manual** |
| **1–2** | P0 polish + E-E-A-T + Wave A start | Meta/FAQ/CTA on `/`, checker, AI tutor, band-score; **E-E-A-T ship: author byline + profile, methodology page, last-updated dates, breadcrumbs/Organization schema**; publish 5–6 Wave A Q&A snippet posts first (fastest to rank: word count, paragraphs, idioms, "I", timing); refresh plateau + band-6-vs-7; CWV pass on P0; decide claims (keep/soften/prove) | **Done** |
| **3–4** | Wave A finish + tool depth + first data study | Remaining Wave A (ChatGPT cluster + structure + 7→8) with FAQ schema; deepen Task 1/2 checker + mock; internal link audit; band score **calculator widget** live; start data study #2 (ChatGPT vs us vs examiner) collection; first off-site action | **Nearly done (4 Aug 2026):** Wave A + tools + calculator + link audit **done**. Off-site draft + data-study protocol ready → `SEO/NEXT_SESSION.md` |
| **5–6** | Wave B essay types + data study publish | 5 essay-type templates + types hub + TR + GRA errors; publish accuracy data study + pitch to communities; homepage "latest from the blog" section for crawl paths | **Partial (4 Aug 2026):** Wave B posts + homepage latest **done**; data study publish open |
| **7–8** | Wave B finish + criteria | Intro/paraphrase, self-edit, Task 1 overview/mistakes, GT letters, Task 1 vs Task 2 guide; monthly refresh pass on Tier-1; second data study |
| **9–10** | Topic cluster (3 themes) | Education / Technology / Environment Band 9 sample pages with full flywheel block — each unique (B4 bar), no template cloning |
| **11–12** | Topic cluster + review | Health / Government / Work; GSC title rewrites for top impressions; prune/merge zero-impression thin URLs after 90d rule; roadmap retrospective → next quarter queue |

**Velocity (corrected for the ~30-URL target — this is the minimum, not the stretch):**
- **2–3 new posts/week** (batch-draft weekly: SERP recon Mon, draft Tue–Wed, quality-bar review + publish Thu–Fri)
- **2 improves/week** from C6 decision rules (Tue titles, Thu links/FAQ/content)
- If capacity forces a choice: improves on pages with impressions **beat** new posts — data-backed wins ship first

**Indexing pipeline (every publish, same day):**
1. Regenerate sitemap → 2. GSC "Request indexing" → 3. IndexNow ping (Bing) → 4. Link from homepage "latest" + relevant hub → 5. Log date; check indexed status at day 7 (C6 rules)

**Cadence guardrails:**
- Never create speaking/reading/leaked-test content
- Every post passes B4 quality bar + SERP recon before publish — velocity never beats quality (HCU risk #21)

**Off-site (parallel, after Week 2 — keep from EXTERNAL_CHECKLIST):**
- Reddit value-first · Product Hunt / AlternativeTo · one YouTube Short · partner/HARO later  
- Data studies (D9) are the primary backlink asset — pitch each one  
- Does not replace on-site flywheel work  

---

## Part F — What “good” looks like (lead KPIs)

Track in `MEASUREMENT.md` scorecard:

| KPI | Why |
|-----|-----|
| Indexed URL count (www) | Foundation health |
| **Time-to-index per new post (target <7 days)** | Pipeline health — if this slips, stop creating and fix foundations |
| Impressions on P0 + Wave A | Discovery working |
| CTR on rewritten titles | Snippet quality |
| **Queries in top 10 / top 3 (count, weekly)** | Leading indicator — moves weeks before traffic does |
| **Featured snippets / PAA captured (count)** | Position #0 strategy working |
| Clicks → `/ielts-essay-checker` (landing) | Flywheel conversion |
| Free eval starts from organic | Business outcome |
| Avg position Tier-1 queries | Authority building |
| **Referring domains (monthly)** | Data-study / link-magnet program working |
| Pages with 0 impressions @ 90d | Prune / merge candidates |

**Competitor tracking (monthly, 30 min):** for the 20 D2 keywords, record who holds positions 1–3 (Liz / Advantage / Writing9 / official). We are "better than everyone" only when we displace them query by query — this table is the proof.

**Milestone expectations (honest, for a newer domain):**
- Weeks 2–4: Q&A posts indexed, first impressions
- Weeks 4–8: long-tail top-10 entries, first snippet captures
- Weeks 8–12: Wave A posts top-5 on exact match; checker landing impressions climb
- Months 4–6: cluster authority compounds; commercial head terms move — do not panic-pivot before this

---
