# SEO Phase 2 — Design, Content Depth & Organic Growth

**Goal:** Maximize organic SEO by upgrading weak Phase 1 work, shipping production-ready design/content, putting Blog in the navbar, then running external growth.

**Status at start of Phase 2:** Phase 1 ~71% (40/56). Agent foundation shipped; content/design thin; GSC/Bing not done; prod prerender off.

---

## Status review

### Completed (Phase 1)

| Area | What exists |
|------|-------------|
| Workspace | `/SEO` docs, tracker, guides, scripts |
| Technical | robots, sitemap, homepage meta/OG/schema, Helmet |
| Routes | 6 tool pages, `/blog` + 16 posts, `/terms` `/privacy` `/cookies` |
| Footer | Blog + legal links |
| Guides | GSC, Reddit, communities, backlinks, YouTube |

### Remaining from Phase 1 (mostly You)

- A11–A13: GSC, Bing, domain verify
- B6–B7: Submit sitemap, OG image asset
- C2, C4: Legal approve (superseded by Phase 2 rewrite), social URLs
- D8: Verify marketing claims
- F2, F4: Weekly GSC, title rewrites
- G3–G9: Directories, outreach, partners, HARO, hreflang, programmatic pages

### Weaknesses found (must fix)

1. SEO pages look like plain text docs — not landing-quality
2. Blog posts ~130–280 words; samples incomplete
3. Tool pages thin; no FAQ/schema depth
4. Legal draft banners + short templates
5. Blog only in footer (poor discovery + crawl path)
6. No OG image; Pricing has no unique meta
7. Prerender not in Vercel production build
8. Social `href="#"`; unverified homepage claims

---

## Part 1 — Agent (do first)

### 1A. SEO design system (match landing)

Rebuild `SeoLayout`, tool pages, blog list/post, legal pages:

- Wider layout (`max-w-[1440px]`), tinted hero bands, Nunito/`#1a1f36`/`#3B82F6`
- Reuse FAQ accordion pattern, CTA illustration band
- Blog: card grid, type badges, read time
- Legal: TOC + polished sections, **no draft banner**
- **Do not** redesign Hero/Navbar chrome — only add Blog tab

### 1B. Blog in Navbar

- Add **Blog** to desktop + mobile nav → `/blog`
- Keep footer Blog as secondary
- Fix hash links from non-home routes

### 1C. Production legal copy

Rewrite Terms / Privacy / Cookies comprehensively (AI tutor, Stripe, processors, GDPR-style rights, cookies table). Remove draft flags/banners.

### 1D. Deepen all 16 blog posts

- Guides/plans: 900–1,500 words
- Samples: full essay/report/letter + criterion table + fix cards
- Comparisons: honest tables + CTAs; no unverified claims

### 1E. ~10 new posts (product + IELTS)

1. Error taxonomy (TR/CC/LR/GRA)
2. Dual-model grading explained (trust)
3. Task Response vs Achievement decoded
4. Mock exam → report → 14-day sprint
5. Personalized learning editions
6. Academic vs GT writing paths
7. Lexical resource: Band 6→7 collocations
8. Handwriting / OCR practice tips
9. Free → weekly → monthly (educational pricing)
10. Plateau / Tutor’s Verdict at 6.5

### 1F. Expand 6 tool pages

800–1,200 words each + FAQ accordion + FAQPage JSON-LD + CTAs + internal links.

### 1G. Technical

- Wire OG image in `SeoHead` + `index.html`
- `SeoHead` on Pricing
- Vercel-compatible prerender attempt (`@sparticuz/chromium` or static snapshots)
- Footer Resources links to tool pages
- Update TRACKER / calendar / EXTERNAL_CHECKLIST for Phase 2

---

## Part 2 — You (after Part 1 deploys)

1. Confirm prod: Blog in nav, deep posts, legal without draft banner
2. Google Search Console — verify + submit sitemap
3. Bing Webmaster — import from GSC
4. Request indexing: `/`, `/ielts-ai-tutor`, `/ielts-essay-checker`, `/blog`, top 5 posts
5. Claims decision (10k / 4.9 / 2,400) — keep, soften, or replace
6. Send real social profile URLs for footer
7. Weekly GSC scorecard (`MEASUREMENT.md`)
8. Reddit / communities (value-first)
9. Product Hunt + AlternativeTo
10. One YouTube Short from existing scripts

---

## Part 3 — Hard / later

| Item | Owner | When |
|------|-------|------|
| Programmatic sample-essay pages | Agent | After 4 weeks GSC data |
| Dedicated comparison landings | Agent | After tool pages gain traction |
| Per-post OG images | Shared | After brand OG works |
| Author / E-E-A-T person pages | Shared | When you name an editor |
| Backlink outreach campaigns | You | Ongoing |
| Partner / tutor free credits | You | Ongoing |
| Guest posts / HARO | You | Ongoing |
| hreflang / localized pages | Shared | After English base |
| Core Web Vitals audit | Agent | After design pass |
| www ↔ apex redirect confirm | You | With GSC |

---

## Execution order

1. Design system + Navbar Blog + legal rewrite  
2. Expand tool pages + deepen 16 posts (batches)  
3. Add 10 new posts  
4. Technical (OG, pricing meta, prerender, footer, tracker)  
5. You run Part 2  
6. Part 3 after indexing data exists  

## Non-goals

- No Hero / pricing / auth / grading redesign  
- App chrome stays **IELTSGRADER**; SEO copy stays **IELTS AI Tutor** dual-brand  
