# Technical SEO Checklist

## Current stack

- **Frontend:** Vite + React SPA on Vercel
- **Routing:** `vercel.json` catch-all → `index.html` (all routes client-rendered)
- **Domain:** `ieltsgrader.com`

## SPA crawl risk

Google can render JavaScript, but a pure SPA shares one HTML shell. Mitigations implemented:

1. **Static meta in `index.html`** — baseline for `/`
2. **`react-helmet-async`** — per-route title/description on blog + tool pages
3. **`vite-plugin-prerender`** — pre-renders critical public URLs at build time
4. **`robots.txt` + `sitemap.xml`** in `public/`

### Prerendered routes (build time)

Post-build script: `ielts-grader-app/scripts/prerender.mjs` (runs via `npm run build`).

```bash
cd ielts-grader-app && npm run build
# Skip prerender locally: npm run build:no-prerender
```

Routes prerendered:

- `/pricing`
- `/ielts-ai-tutor`
- `/ielts-essay-checker`
- `/ielts-task-1-checker`
- `/ielts-task-2-checker`
- `/ielts-writing-band-score`
- `/ielts-mock-writing-test`
- `/blog`
- `/terms`, `/privacy`, `/cookies`
- Each published blog slug (from `src/content/blog/*.md`)

Regenerate sitemap after adding routes:

```bash
python3 SEO/scripts/generate_sitemap.py
```

## Checklist

### Done (Phase B)

- [x] `robots.txt` with sitemap reference
- [x] `sitemap.xml` (generated)
- [x] Unique title + meta description on homepage
- [x] Open Graph + Twitter Card tags
- [x] Canonical URL on homepage
- [x] JSON-LD: SoftwareApplication + FAQ (homepage)
- [x] JSON-LD: Article (blog posts)
- [x] `lang="en"` on html

### Done (Phase E)

- [x] Per-route meta via Helmet
- [x] Post-build prerender script for critical routes
- [x] Legal pages indexable
- [x] Blog index + post pages

### You (post-deploy)

- [ ] Google Search Console verified
- [ ] Bing Webmaster Tools verified
- [ ] Sitemap submitted
- [ ] Request indexing for key URLs
- [ ] Core Web Vitals check in PageSpeed Insights

### Optional / later

- [ ] Custom favicon (replace vite.svg)
- [ ] OG image 1200×630 (see `assets/og-image-spec.md`)
- [ ] hreflang for localized pages (G8)
- [ ] CDN cache headers audit

## robots.txt rules

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /report
Disallow: /performance
Disallow: /learning
Disallow: /settings
Disallow: /admin
Disallow: /subscription
Disallow: /upgrade
Disallow: /analysis-ready
Sitemap: https://ieltsgrader.com/sitemap.xml
```

## Structured data types

| Page | Schema |
|------|--------|
| Homepage | SoftwareApplication, FAQPage |
| Blog post | Article, BreadcrumbList |
| Tool pages | WebPage, FAQPage (where FAQ exists) |
| How-to posts | HowTo (optional) |

Templates in `SEO/schema/`.

## No-impact rule

Technical changes must not alter:
- Hero, Navbar, CTA layout or styles
- Auth, grading, payment, or dashboard logic
- Existing route behavior for logged-in users
