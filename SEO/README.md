# SEO Workspace — IELTS AI Tutor by IELTSGRADER

This folder is the **single source of truth** for organic SEO work. It does not change app UI design or grading functionality unless tasks are explicitly shipped in Phase E.

## Quick start

1. Open **[TRACKER.md](TRACKER.md)** — master checklist with every task, owner, and status.
2. Run progress: `python3 SEO/scripts/tracker_status.py`
3. Read **[BRANDING.md](BRANDING.md)** before writing any copy.
4. Follow phases in order: A → B → C → D → E → F → G.

## Folder map

| Path | Purpose |
|------|---------|
| [TRACKER.md](TRACKER.md) | Progress tracker (update status as you go) |
| [BRANDING.md](BRANDING.md) | Dual-brand voice: IELTS AI Tutor + IELTSGRADER |
| [KEYWORDS.md](KEYWORDS.md) | Keyword clusters and target URLs |
| [TECHNICAL.md](TECHNICAL.md) | Technical SEO checklist |
| [CONTENT_CALENDAR.md](CONTENT_CALENDAR.md) | 8-week publish schedule |
| [INTERNAL_LINKING.md](INTERNAL_LINKING.md) | Link rules between pages |
| [MEASUREMENT.md](MEASUREMENT.md) | Weekly KPI scorecard |
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
