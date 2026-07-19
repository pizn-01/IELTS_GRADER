# Google Search Console — Setup Guide

## Step 1: Add property

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add property**
3. Choose **URL prefix**: `https://www.ieltsgrader.com`  
   (Vercel redirects apex `ieltsgrader.com` → `www`. Use the www property so you don’t inspect redirecting URLs.)

## Step 2: Verify ownership

**Recommended — DNS (you control domain):**
1. Copy the TXT record Google provides
2. Add it in your domain registrar (where ieltsgrader.com DNS is managed)
3. Click Verify in GSC

**Alternative — HTML file:**
1. Download Google's verification file (e.g. `google123.html`)
2. Place in `ielts-grader-app/public/`
3. Deploy to Vercel
4. Verify in GSC

Tell the agent the verification file name if you need help adding it.

## Step 3: Submit sitemap

1. GSC → **Sitemaps**
2. Enter: `sitemap.xml`
3. Submit

Regenerate after new routes:
```bash
python3 SEO/scripts/generate_sitemap.py
```

## Step 4: Request indexing (key URLs)

Use **URL Inspection** for each (www only — apex redirects):
- `https://www.ieltsgrader.com/`
- `https://www.ieltsgrader.com/ielts-ai-tutor`
- `https://www.ieltsgrader.com/ielts-essay-checker`
- `https://www.ieltsgrader.com/blog`

## Bing Webmaster Tools

1. Go to [Bing Webmaster](https://www.bing.com/webmasters)
2. **Import from Google Search Console** (fastest) or add site manually
3. Submit same `sitemap.xml`

## Weekly routine

See [MEASUREMENT.md](../MEASUREMENT.md). Export Performance data and run:
```bash
python3 SEO/scripts/gsc_summarize.py ~/Downloads/gsc-pages.csv
```

## Tracker

Mark **A11**, **A12**, **B6** as `done` in [TRACKER.md](../TRACKER.md) when complete.
