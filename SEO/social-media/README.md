# Social Ops Agent — how to use this (employees + managers)

This folder prepares your week of **replies and posts**.  
**You** paste and publish. The agent **never posts for you**.

Full voice rules: [EMPLOYEE_PLAYBOOK.pdf](EMPLOYEE_PLAYBOOK.pdf)

---

## Pipeline (cold start vs weekly)

```text
Cold start (once)
  → historical listen (Serper; Reddit/Quora undated-first)
  → free-time Onboarding engage queue (separate from Today/Pending)
  → onboarding brief + theme_bank.json

Weekly (Monday 00:00 ET auto)
  → 7-day discover CSV
  → LLM/heuristic relevance filter
  → engage ≈ filtered N (cap 500), days ≈ N/7 + create pack
  → MERGE into durable STATUS (keep open pending across weeks)
  → seen_urls (90d) + engaged_urls memory (no duplicates)
  → you paste → done / wait reply / dead
```

**Cold start does not fill the weekly reply queue.** It seeds themes for create posts and a free-time Onboarding engage pack. Weekly merges new discovery into durable STATUS (open tasks survive Monday refresh until Done or Dead).

**Pending / Today:** open = pending + awaiting_reply + got_reply. Today ≈ this-week-new / 7 for new items’ day slots, plus overdue pending from prior weeks. Auto Monday 00:00 ET on Fly.

**Reply notifications:** platforms never push into Admin. After paste, mark **Wait for reply**, then check **Awaiting replies** later (Got reply / Still waiting / Dead).

---

## For you (employee)

### Easiest: Admin → Social Ops
If you have admin access, open the app → **Admin** → **Social Ops**.  
**First time:** Cold start once → then Monday **Start / refresh week**.  
No Terminal needed for day-to-day work.

### Funnel numbers (why Today ≠ everything found)
Admin shows: **Discovered → After filter → Engage (~173) + Create → Today’s slice**.

| View | Meaning |
|------|---------|
| Today’s work | Only today’s weekday (+ overdue) — roughly ~35 engages/day when the week is full |
| Full week pending | All ~173 replies + create posts still open (**~200** total) |
| Everything | Including done/skipped |

### What good looks like each week
- **173** helpful replies · **12** posts/Shorts · **10** high-intent  
- **~22%** of engage drafts with soft CTA + disclosure + UTM (`ieltsgrader.com`)  
- Most **create** actions include a platform-appropriate CTA (URL / link in bio)  
- Value-first on the rest — not every reply is a promo  

### Every work day
1. **Show today’s work** → Copy next → open URL → paste → publish  
2. Mark **Done**, or **Wait for reply** if you want to check later  
3. Later: open thread → **Got reply** (drafts a follow-up) / **Still waiting** / **Dead**

### Monday
**Start / refresh week** first (discover → filter → drafts), then work the list.

### Sunday
**Sunday scorecard** — includes CTA reply/post counts and follow-ups.

### Rules (always)
1. Value first — teach something useful  
2. Disclose when you mention the product  
3. No band guarantees / no “100% accurate”  
4. No link spam — especially on Reddit  
5. Warm up Reddit with helpful comments before any promo  

---

## Memory files (anti-duplicate)
- `output/engaged_urls.csv` — threads you marked done / skipped / waiting  
- `output/seen_urls.csv` — URLs that entered a queue (90-day TTL)  
Weekly triage skips both so the same thread is not drafted every week.

---

## For your manager (once)

1. Install Python 3  
2. In `scripts/`:  
   `pip install -r requirements.txt`  
   `cp .env.example .env` — add keys (Serper, OpenAI; YouTube optional)  
3. Setup check until critical items are OK  
4. **Cold start** once  
5. Optional schedule: see `scripts/cron.example.txt`

Production (Fly): secrets via `fly secrets`; output persists on the `social_ops_data` volume.

---

## If something breaks
Run setup check. Ask your manager — don’t guess API keys.  
Without OpenAI, the agent still builds a week using safe templates + heuristic filter.

---

## Where files live
- This week’s work: `output/THIS_WEEK/` (open **OPEN_ME.md**)  
- Funnel meta: `output/THIS_WEEK/_meta/funnel.json`  
- Filtered listen: `output/THIS_WEEK/_meta/filtered_discovery.csv`  
- Old weeks: `output/archive/`  
- Onboarding: `output/cold-start/ONBOARDING_BRIEF.md`
