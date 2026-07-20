# Social Ops Agent — how to use this (employees + managers)

This folder prepares your week of **replies and posts**.  
**You** paste and publish. The agent **never posts for you**.

Full voice rules: [EMPLOYEE_PLAYBOOK.pdf](EMPLOYEE_PLAYBOOK.pdf)

---

## Pipeline (cold start vs weekly)

```text
Cold start (once)
  → historical listen (Serper; Reddit/Quora undated-first)
  → onboarding brief + theme_bank.json
  → study only (do NOT paste into old threads)

Weekly (Monday)
  → 7-day discover CSV
  → LLM/heuristic relevance filter
  → top 50 engage + ~create pack
  → seen_urls (90d) + engaged_urls memory (no duplicates)
  → you paste → mark done / wait reply / got reply
```

**Cold start does not fill the weekly reply queue.** It seeds themes for create posts and an onboarding study list. Weekly always does a fresh 7-day search.

---

## For you (employee)

### Easiest: Admin → Social Ops
If you have admin access, open the app → **Admin** → **Social Ops**.  
**First time:** Cold start once → then Monday **Start / refresh week**.  
No Terminal needed for day-to-day work.

### Funnel numbers (why Today ≠ everything found)
Admin shows: **Discovered → After filter → Engage (~50) + Create → Today’s slice**.

| View | Meaning |
|------|---------|
| Today’s work | Only today’s weekday (+ overdue) — often ~8 Mon engages |
| Full week pending | All ~50 replies + create posts still open (~79) |
| Everything | Including done/skipped |

### What good looks like each week
- **50** helpful replies · **12** posts/Shorts · **10** high-intent  
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
