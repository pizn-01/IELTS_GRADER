# Social Ops Agent — how to use this (employees + managers)

This folder prepares your week of **replies and posts**.  
**You** paste and publish. The agent **never posts for you**.

Full voice rules: [EMPLOYEE_PLAYBOOK.pdf](EMPLOYEE_PLAYBOOK.pdf)  
**Ban-safe per-platform identity + effort priority:** [PLATFORM_GUIDELINES.pdf](PLATFORM_GUIDELINES.pdf) · [STRATEGY.md](STRATEGY.md) · [LINKEDIN.md](../guides/LINKEDIN.md) · [REDDIT.md](../guides/REDDIT.md)

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
- Helpful replies · posts/Shorts · high-intent threads  
- Soft CTAs only on **Quora / X / YouTube** (~22% of those engages) + UTM  
- **Reddit & LinkedIn comments: value-only** (no links, no disclosure)  
- Once a URL is filtered or queued, it is **not** re-suggested next Monday  
- Value-first on the rest — not every reply is a promo  

### Rules (always)
1. Value first — teach something useful  
2. Disclose when you mention the product **on allowed platforms**  
3. No band guarantees / no “100% accurate”  
4. No link spam — Reddit and LinkedIn comments never carry product links  
5. Neutral Reddit handle; LinkedIn person profile for comments  
6. Soft CTAs: Quora / X / YouTube (and bios for IG/TikTok) 

---

## Memory files (anti-duplicate)
- `output/engaged_urls.csv` — threads you marked done / skipped / waiting  
- `output/seen_urls.csv` — URLs that entered filter/queue (90-day TTL)  
- `output/parent_url_ids.csv` + STATUS — every queued parent URL (including still-pending)  
Weekly filter/triage skips all of the above (canonical keys: Reddit post id, host variants). Once filtered or pending, a thread is never re-drafted as a new action.

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
