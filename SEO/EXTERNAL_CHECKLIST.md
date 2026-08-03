# External SEO — Your Action Checklist (Phase 2)

Agent Phase 2 work is done (design, legal, blog depth, tool pages, navbar Blog, OG image).

**All guided “You” items below are REMAINING / UNDONE** until you ask to continue.

## Done (prod check only)
- [x] Confirm prod deploy (blog cards, Blog in nav, legal without draft banner, OG image)

## Remaining — indexing (start here next time)
- [ ] **GSC** — verify `www.ieltsgrader.com` ([guides/GOOGLE_SEARCH_CONSOLE.md](guides/GOOGLE_SEARCH_CONSOLE.md))
- [ ] **Bing** — import from GSC
- [ ] **Submit sitemap:** `https://www.ieltsgrader.com/sitemap.xml`
- [ ] **Request indexing** for www URLs only (`/`, `/ielts-ai-tutor`, `/ielts-essay-checker`, `/blog`, `/methodology`, Wave A posts below) — apex redirects and will show “Page with redirect”

## You — Wave A posts already shipped (quality + index)

Full checklist: **[CONTENT_QUALITY_BAR.md](CONTENT_QUALITY_BAR.md)** § “You — what to do for posts already live”.

**Index in GSC (URL Inspection → Request indexing)** after deploy:
- [ ] `/blog/improve-ielts-writing-band-7-to-8`
- [ ] `/blog/why-chatgpt-overestimates-ielts-band-scores`
- [ ] `/blog/ultimate-chatgpt-prompt-ielts-task-2`
- [ ] `/blog/is-chatgpt-accurate-ielts-writing`
- [ ] `/blog/best-essay-structure-ielts-task-2`
- [ ] `/blog/how-many-words-ielts-task-2` (+ paragraphs / idioms / “I” / timing / ideas)
- [ ] `/blog/stuck-at-band-6-5-plateau` · `/blog/band-6-vs-7-task-2`

**Human quality pass (this week):**
- [ ] SERP recon each primary keyword → replace `PENDING` in `serpNotes` (or send notes to agent)
- [ ] Skim for tone/claims; set `qualityReviewed: ok` when done
- [ ] Optional: ChatGPT comparison screenshots for accuracy + overestimate + prompt posts → agent embeds

**Validate:** `python3 SEO/scripts/validate_blog_quality.py` (use `--strict` after your review)

## Remaining — trust & brand
- [ ] **Claims decision** — keep / soften / replace “10k students / 4.9 rating” (see [CLAIMS.md](CLAIMS.md); many already softened)
- [ ] **Social URLs** — real X / Instagram / YouTube / LinkedIn for footer

## Remaining — ongoing growth
- [ ] Follow **site-only** cadence: [WEBSITE_SEO_CADENCE.md](WEBSITE_SEO_CADENCE.md) / [WEBSITE_SEO_CADENCE.pdf](WEBSITE_SEO_CADENCE.pdf)
- [ ] Weekly GSC scorecard ([MEASUREMENT.md](MEASUREMENT.md))
- [ ] Social media hire: follow [social-media/STRATEGY.md](social-media/STRATEGY.md) + [social-media/EMPLOYEE_PLAYBOOK.pdf](social-media/EMPLOYEE_PLAYBOOK.pdf) + [social-media/PLATFORM_GUIDELINES.pdf](social-media/PLATFORM_GUIDELINES.pdf)
- [ ] Add `SERPER_API_KEY` + `YOUTUBE_API_KEY` and run weekly: `python3 SEO/social-media/scripts/search_weekly.py`
- [ ] Reddit value-first ([guides/REDDIT.md](guides/REDDIT.md) + social playbook) — prefer linking a ChatGPT trust post, not a hard sell
- [ ] Product Hunt + AlternativeTo ([guides/BACKLINKS.md](guides/BACKLINKS.md))
- [ ] One YouTube Short ([guides/YOUTUBE_SHORTS.md](guides/YOUTUBE_SHORTS.md))

## Remaining — hard / later
- [ ] Partner/tutor outreach
- [ ] Guest posts / HARO
- [ ] Localized pages
- [ ] Programmatic sample-essay pages

## Resume
Say **continue SEO next steps** — we restart at GSC (Step 2), one by one.
