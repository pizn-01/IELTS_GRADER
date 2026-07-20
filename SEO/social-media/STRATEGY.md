# Social Media Strategy — One Dedicated Hire

**Product:** IELTS AI Tutor by IELTSGRADER  
**Site:** https://ieltsgrader.com  
**Audience focus:** IELTS Writing students seeking feedback, band scores, tutors, and practice tools  
**Role:** Content + engagement specialist (create, reply, listen) — not paid ads

Brand accounts exist on: Facebook, Instagram, Reddit, Quora, Twitter/X, LinkedIn, TikTok, YouTube.

---

## North star

Trust first → free evaluation → branded search / direct visits to `ieltsgrader.com`.  
Never optimize for link dumps. Optimize for helpful answers that earn the right to mention the product.

**Primary CTA:** Get your free band score  
**Secondary CTAs:** Try the AI tutor free · Start mock writing test

---

## Time split (~40 hrs/week)

| Share | Activity |
|------:|----------|
| 40% | Replies & engagement (highest conversion for one person) |
| 35% | Post / Short / Reel creation |
| 15% | Listening (weekly discovery script + trends) |
| 10% | Reporting & backlog |

---

## Priority tiers (ROI with one person)

### Tier 1 — Daily
| Platform | Why | Focus |
|----------|-----|--------|
| Reddit | High-intent questions; students ask for feedback | Value comments first; rare links |
| Quora | Long-lived SEO + intent | Detailed answers; soft CTA |
| Twitter/X | Fast IELTS discourse | Threads, reply to tutors/students |

### Tier 2 — 3–5× / week
| Platform | Why | Focus |
|----------|-----|--------|
| YouTube | Authority + Shorts discovery | 45–60s writing fixes; link in description |
| Instagram | Same Short assets as Reels | Captions + Stories + link in bio |
| TikTok | Same short-form edit | Native caption style; link in bio |

### Tier 3 — 2–3× / week
| Platform | Why | Focus |
|----------|-----|--------|
| LinkedIn | Parents, teachers, education buyers | Longer trust posts |
| Facebook | Groups + page for GT / study-abroad parents | Group-safe help; page posts |

**Repurposing rule:** One short (YouTube Short → TikTok → Instagram Reel) with platform-specific captions. Do not reinvent creative three times.

---

## Weekly operating cadence

| Day | Focus |
|-----|--------|
| **Mon** | Run `search_weekly.py`. Triage high-engagement threads. Plan 3–5 replies + 2–3 posts for the week. |
| **Tue–Thu** | Create scheduled posts/Shorts. Reply in Tier 1 platforms daily (target ≥10 helpful replies/day total across Reddit/Quora/X). |
| **Fri** | Deep replies on threads with huge engagement from Mon list + historical CSV. |
| **Sun** | Report: posts published, replies sent, profile visits / bio clicks (if available), free eval mentions, content backlog. |

---

## Guardrails

1. **Value first** — teach something useful in every post and reply.
2. **Disclose** when mentioning IELTSGRADER / IELTS AI Tutor (“I’m affiliated with…”.
3. **No band guarantees** — never promise Band 7 / 100% accuracy.
4. **Soft claims** — avoid unverified “10k students / 4.9 rating” until approved (see `SEO/BRANDING.md`).
5. **Platform rules** — Reddit/Quora self-promo is especially strict; earn trust before links.
6. **Link placement** — prefer bio / description / allowed CTA fields; put URLs in comments only when invited or clearly relevant.
7. **Scripts never auto-post** — discovery CSVs are listening tools only.

---

## Conversion reply ladder (all platforms)

1. Answer the writing/exam question with a concrete tip (criteria, example, fix).
2. Offer a next step without a hard sell (e.g. “Happy to look at one paragraph if you paste it”).
3. Soft product mention **only if** asked for tools / checkers / tutors, or clearly appropriate.
4. Link via bio or one clear URL + disclosure.
5. Follow up on their reply — conversation > dump-and-leave.

**Disclosure line (use when promo):**
> Full disclosure: I’m affiliated with IELTS AI Tutor by IELTSGRADER (ieltsgrader.com).

**Safe soft CTA:**
> If you want criterion-by-criterion feedback in about a minute, we built a free evaluation at ieltsgrader.com — no pressure either way.

---

## Posting frequency (targets)

| Platform | Create | Engage |
|----------|--------|--------|
| Reddit | 1 value post / week | Daily comments (no link spam) |
| Quora | 3–5 answers / week | Reply to comments on your answers |
| Twitter/X | 4–7 posts or threads / week | Daily replies |
| YouTube | 3–5 Shorts / week (+ 1 long optional) | Reply to comments daily |
| Instagram | 3–5 Reels / week + 3–5 Stories | Reply to DMs / comments |
| TikTok | 3–5 videos / week | Reply to comments |
| LinkedIn | 2–3 posts / week | Comment on IELTS/edtech posts |
| Facebook | 2–3 page posts / week | Helpful group comments where allowed |

---

## KPIs (weekly scorecard)

| Metric | Target (starting) |
|--------|-------------------|
| Helpful replies (all platforms) | ≥50 / week |
| Original posts / Shorts published | ≥12 / week (with repurposing) |
| High-intent threads engaged (from weekly CSV) | ≥10 / week |
| Profile / bio link clicks | Track if Insights available |
| Free evaluation starts attributed to social | Track UTM if used (`?utm_source=…`) |
| Branded search (GSC) | Monitor “ieltsgrader” / “IELTS AI Tutor” |

---

## Discovery scripts (listening)

**Employees:** use **[README.md](README.md)** and double-click **`Start.command`** (menu). Do not run raw scripts day-to-day.

From `SEO/social-media/scripts/` (managers / automation):

```bash
pip install -r requirements.txt
cp .env.example .env   # SERPER_API_KEY, YOUTUBE_API_KEY, OPENAI_API_KEY

python3 menu.py                 # employee front door
python3 run_cold_start_agent.py # once / occasional (historical)
python3 run_weekly_agent.py     # Monday
python3 run_daily_brief.py      # Tue–Fri (+ fresh listen)
python3 run_sunday_wrap.py      # Sunday scorecard

# Low-level listening only:
python3 search_historical.py
python3 search_weekly.py
```

Outputs land in `SEO/social-media/output/` (`THIS_WEEK/`, CSVs). Scripts never auto-post.

**Limits:** Reddit + YouTube use native APIs/stats. Facebook, Instagram, Quora, X, LinkedIn, TikTok are found via Serper web search of indexed public pages — engagement often unknown. Scripts do not replace native platform Insights.

---

## Employee handoff

Give the hire: **[README.md](README.md)** + **`Start.command`** + **`EMPLOYEE_PLAYBOOK.pdf`** + brand account access. Manager configures `scripts/.env` once.

Fill brand handle list below when ready for footer / bio consistency:

| Platform | Handle / URL |
|----------|----------------|
| Facebook | |
| Instagram | |
| Reddit | |
| Quora | |
| Twitter/X | |
| LinkedIn | |
| TikTok | |
| YouTube | |

---

## Related docs

- Brand voice: [`../BRANDING.md`](../BRANDING.md)
- Reddit detail: [`../guides/REDDIT.md`](../guides/REDDIT.md)
- YouTube Shorts: [`../guides/YOUTUBE_SHORTS.md`](../guides/YOUTUBE_SHORTS.md)
- Communities / outreach: [`../guides/COMMUNITIES.md`](../guides/COMMUNITIES.md)
