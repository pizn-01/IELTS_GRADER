# SEO Progress Tracker

Update the **Status** column as work completes. Run `python3 SEO/scripts/tracker_status.py` for a summary.

**Statuses:** `todo` | `in_progress` | `blocked_on_you` | `done`

---

## Phase A — Free / easy (workspace)

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| A1 | Create `/SEO` tree + README | A | Agent | done | |
| A2 | Create TRACKER.md with all IDs | A | Agent | done | |
| A3 | Write BRANDING.md | A | Agent | done | |
| A4 | Write KEYWORDS.md | A | Agent | done | |
| A5 | Write TECHNICAL.md | A | Agent | done | |
| A6 | Draft improved index.html meta in SEO/docs | A | Agent | done | See `assets/index-meta-draft.md` |
| A7 | Blog _TEMPLATE.md + first 4 post outlines | A | Agent | done | `blog/week-01/` |
| A8 | Tool-page outlines (6 pages) | A | Agent | done | `pages/` |
| A9 | Schema JSON drafts | A | Agent | done | `schema/` |
| A10 | Add scripts/tracker_status.py | A | Agent | done | |
| A11 | Create Google Search Console property | A | You | blocked_on_you | See `guides/GOOGLE_SEARCH_CONSOLE.md` |
| A12 | Create Bing Webmaster Tools property | A | You | blocked_on_you | See `guides/GOOGLE_SEARCH_CONSOLE.md` |
| A13 | Verify domain (DNS or HTML file) | A | Shared | blocked_on_you | Provide token when ready |

## Phase A — External guides

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| AG1 | GOOGLE_SEARCH_CONSOLE.md | A | Agent | done | |
| AG2 | REDDIT.md | A | Agent | done | |
| AG3 | COMMUNITIES.md | A | Agent | done | |
| AG4 | BACKLINKS.md | A | Agent | done | |
| AG5 | YOUTUBE_SHORTS.md | A | Agent | done | |

## Phase B — Technical SEO

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| B1 | Add public/robots.txt + sitemap.xml | B | Agent | done | |
| B2 | Update index.html meta + OG/Twitter | B | Agent | done | |
| B3 | Add canonical + JSON-LD on homepage | B | Agent | done | |
| B4 | generate_sitemap.py script | B | Agent | done | |
| B5 | Document prerender need in TECHNICAL.md | B | Agent | done | |
| B6 | Submit sitemap in GSC + Bing | B | You | blocked_on_you | After deploy |
| B7 | OG image asset (spec first) | B | Shared | blocked_on_you | See `assets/og-image-spec.md` |

## Phase C — Trust / legal

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| C1 | Draft Terms / Privacy / Cookies | C | Agent | done | `legal-drafts/` |
| C2 | Legal review / approve | C | You | blocked_on_you | |
| C3 | Add /terms /privacy /cookies routes + Footer links | C | Agent | done | Routes ready; approve copy before go-live |
| C4 | Fix social href="#" when URLs provided | C | Shared | blocked_on_you | |

## Phase D — Content engine

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| D1 | CONTENT_CALENDAR.md (8 weeks) | D | Agent | done | |
| D2 | Pillar: What is an IELTS AI Tutor? | D | Agent | done | `pages/ielts-ai-tutor.md` |
| D3 | Tool pages (6) | D | Agent | done | `pages/` |
| D4 | Weekly blog drafts (16 posts outlined) | D | Agent | done | `blog/week-01` through `week-08` |
| D5 | Comparison pages drafts | D | Agent | done | `pages/comparison-*.md` |
| D6 | FAQ expansion | D | Agent | done | `pages/faq-expansion.md` |
| D7 | INTERNAL_LINKING.md | D | Agent | done | |
| D8 | Review/approve voice + factual claims | D | You | blocked_on_you | 10k students, 4.9 rating, etc. |

## Phase E — Ship into app

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| E1 | /blog list + /blog/:slug routes | E | Agent | done | |
| E2 | Tool landing routes | E | Agent | done | `/ielts-essay-checker`, etc. |
| E3 | Per-route meta (react-helmet-async) | E | Agent | done | |
| E4 | Update sitemap with new URLs | E | Agent | done | |
| E5 | Prerender critical routes | E | Agent | done | vite-plugin-prerender |
| E6 | Breadcrumbs + Article schema on posts | E | Agent | done | |

## Phase F — Measurement

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| F1 | MEASUREMENT.md scorecard | F | Agent | done | |
| F2 | Weekly GSC check | F | You | blocked_on_you | Ongoing |
| F3 | gsc_summarize.py script | F | Agent | done | |
| F4 | Rewrite titles for low-CTR pages | F | Shared | todo | After 4+ weeks of GSC data |

## Phase G — External / hard

| ID | Task | Phase | Owner | Status | Notes |
|----|------|-------|-------|--------|-------|
| G1 | Reddit playbook + 10 post ideas | G | Agent | done | `guides/REDDIT.md` |
| G2 | Communities playbook | G | Agent | done | `guides/COMMUNITIES.md` |
| G3 | Directory listings | G | You | blocked_on_you | Copy in `guides/BACKLINKS.md` |
| G4 | Backlink outreach | G | Shared | todo | Templates ready |
| G5 | YouTube/Shorts scripts | G | Agent | done | `guides/YOUTUBE_SHORTS.md` |
| G6 | Partner/tutor outreach | G | You | todo | |
| G7 | Guest posts / HARO | G | You | todo | |
| G8 | Localized landing pages (hreflang) | G | Shared | todo | Last — after English base works |
| G9 | Programmatic sample-essay pages | G | Agent | todo | Last — after E stable |
