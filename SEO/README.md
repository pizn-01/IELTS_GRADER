# SEO Workspace — IELTS AI Tutor by IELTSGRADER

This folder is the **single source of truth** for organic SEO work. It does not change app UI design or grading functionality unless tasks are explicitly shipped in Phase E.

## Quick start

1. Open **[NEXT_SESSION.md](NEXT_SESSION.md)** — where to resume (Week 3–4 leftovers → Wave B).
2. Open **[TRACKER.md](TRACKER.md)** — master checklist with every task, owner, and status (Phase R = roadmap).
3. Run progress: `python3 SEO/scripts/tracker_status.py`
4. Read **[BRANDING.md](BRANDING.md)** before writing any copy.
5. For **strategy + 12-week content/URL roadmap**: **[WEBSITE_SEO_ROADMAP.md](WEBSITE_SEO_ROADMAP.md)** / [PDF](WEBSITE_SEO_ROADMAP.pdf).
6. Before publishing any post: **[CONTENT_QUALITY_BAR.md](CONTENT_QUALITY_BAR.md)** + `python3 SEO/scripts/validate_blog_quality.py`
7. For **ongoing site SEO ops** (daily/weekly/monthly on ieltsgrader.com): **[WEBSITE_SEO_CADENCE.md](WEBSITE_SEO_CADENCE.md)** / [PDF](WEBSITE_SEO_CADENCE.pdf).
8. Follow phases in order: A → B → C → D → E → F → G.

## Folder map

| Path | Purpose |
|------|---------|
| [NEXT_SESSION.md](NEXT_SESSION.md) | **Resume here** — progress + next actions |
| [TRACKER.md](TRACKER.md) | Progress tracker (update status as you go) |
| [BRANDING.md](BRANDING.md) | Dual-brand voice: IELTS AI Tutor + IELTSGRADER |
| [CLAIMS.md](CLAIMS.md) | Keep / soften / prove decisions for marketing claims |
| [KEYWORDS.md](KEYWORDS.md) | Keyword clusters and target URLs |
| [TECHNICAL.md](TECHNICAL.md) | Technical SEO checklist |
| [CONTENT_CALENDAR.md](CONTENT_CALENDAR.md) | Phase 2 done + Phase 3 queue (from roadmap) |
| [INTERNAL_LINKING.md](INTERNAL_LINKING.md) | Link rules between pages |
| [MEASUREMENT.md](MEASUREMENT.md) | Weekly KPI scorecard |
| [WEBSITE_SEO_ROADMAP.md](WEBSITE_SEO_ROADMAP.md) | **Strategy roadmap** — diagnosis, flywheel, improve/create queues, 12-week plan (+ [PDF](WEBSITE_SEO_ROADMAP.pdf)) |
| [WEBSITE_SEO_CADENCE.md](WEBSITE_SEO_CADENCE.md) | **Site-only** daily / weekly / monthly SEO ops (+ [PDF](WEBSITE_SEO_CADENCE.pdf)) |
| [CONTENT_QUALITY_BAR.md](CONTENT_QUALITY_BAR.md) | **B2/B4 pre-publish gate** + what You do for live posts |
| [EXTERNAL_CHECKLIST.md](EXTERNAL_CHECKLIST.md) | Your action items (Reddit, GSC, directories) |
| [social-media/](social-media/) | Social strategy, employee PDF, weekly/historical discovery scripts |
| [guides/](guides/) | External playbooks (GSC, Reddit, backlinks, etc.) |
| [legal-drafts/](legal-drafts/) | Terms, Privacy, Cookies (approve before shipping) |
| [pages/](pages/) | Tool/landing page copy drafts |
| [blog/](blog/) | Blog post drafts with frontmatter |
| [schema/](schema/) | JSON-LD templates |
| [scripts/](scripts/) | Python automation |
| [assets/](assets/) | OG image specs |

## Owner tags

- **Agent** — can be done in-repo by the AI assistant
- **You** — requires your external accounts or approval
- **Shared** — agent drafts, you review/publish

## Positioning

> **IELTS AI Tutor by IELTSGRADER** — AI writing tutor that grades essays, explains mistakes, builds personalized study plans, and coaches you toward your target band.

## Safety rules

- No Hero/Navbar/CTA visual redesign
- No pricing/auth/grading logic changes
- SEO dual-brand lives in meta, blog, tool pages, and this folder first
- App chrome stays **IELTSGRADER** until a product rebrand is requested

## Regenerate sitemap

```bash
python3 SEO/scripts/generate_sitemap.py
```

Output: `ielts-grader-app/public/sitemap.xml`
