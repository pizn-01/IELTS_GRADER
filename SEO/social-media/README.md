# Social Ops Agent — how to use this (employees + managers)

This folder prepares your week of **replies and posts**.  
**You** paste and publish. The agent **never posts for you**.

Full voice rules: [EMPLOYEE_PLAYBOOK.pdf](EMPLOYEE_PLAYBOOK.pdf)

---

## For you (employee)

### Easiest: Admin → Social Ops
If you have admin access, open the app → **Admin** → **Social Ops**.  
**First time:** Setup check → set missing keys → **Cold start** → then Monday weekly.  
No Terminal needed for day-to-day work.

### Or: double-click Start.command

### What good looks like each week
Progress toward: **50 helpful replies · 12 posts/Shorts · 10 high-intent threads**

### Every work day
1. Double-click **`Start.command`** (Mac)  
   — or open Terminal, go to this folder’s `scripts`, run: `python3 menu.py`
2. Press **`2`** — Show today’s work (opens your brief)
3. Press **`3`** — Copy next reply/post to clipboard → open the URL it prints → paste → publish
4. Press **`4`** — Mark that item done (pick from the list)  
   Repeat 3–4 until today’s list is clear.

### Monday
Press **`1`** first (Start / refresh my week), then work like a normal day with 2 → 3 → 4.

### Friday
In TODAY, do **Deep replies** at the top before other tasks.

### Sunday
Press **`5`** (Sunday scorecard). Add bio-click / free-eval notes if you have them.

### Rules (always)
1. Value first — teach something useful  
2. Disclose when you mention the product  
3. No band guarantees / no “100% accurate”  
4. No link spam — especially on Reddit  
5. Warm up Reddit with helpful comments before any promo  

---

## For your manager (once)

1. Install Python 3  
2. In `scripts/`:  
   `pip install -r requirements.txt`  
   `cp .env.example .env` — add keys (Serper, YouTube, OpenAI)
3. Double-click `Start.command` → press **`6`** until checks look good  
4. From menu 6, run **cold start** once (historical listening / onboarding brief)  
5. Optional schedule: see `scripts/cron.example.txt`

Employee daily path stays: **Start.command → 2 / 3 / 4**.

---

## If something breaks
Press menu **`6`**. Ask your manager — don’t guess API keys.  
Without OpenAI, the agent still builds a week using safe templates.

---

## Where files live
- This week’s work: `output/THIS_WEEK/` (open **OPEN_ME.md**)  
- Old weeks: `output/archive/`  
- Onboarding: `output/cold-start/ONBOARDING_BRIEF.md`
