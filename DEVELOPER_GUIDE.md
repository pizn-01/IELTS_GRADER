# IELTS Grader — Developer Guide

This guide covers everything you need to run the project locally, understand where things live, and deploy changes to production.

---

## Prerequisites

Install these before you start:

- **Node.js v20+** — https://nodejs.org (download the LTS version)
- **npm** — comes with Node.js automatically
- **Git** — https://git-scm.com
- **flyctl** (only needed for backend deploys) — https://fly.io/docs/hands-on/install-flyctl/. After installing, see "Connecting flyctl to the Fly.io account" under Deploying Changes below — you need to log in and be added to the project before you can deploy.

Verify you have everything:
```bash
node -v     # should show v20.x or higher
npm -v      # should show 10.x or higher
git -v      # any version
fly version # any version
```

---

## Getting the Code

```bash
git clone https://github.com/pizn-01/IELTS_GRADER.git
cd IELTS_GRADER
```

---

## Project Structure

```
IELTS_GRADER/
├── backend/                  ← Node.js API server (deployed on Fly.io)
│   ├── src/
│   │   ├── index.js          ← Server entry point
│   │   ├── routes/           ← API route handlers
│   │   │   ├── auth.js       ← Login, register, password reset, email verify
│   │   │   ├── submissions.js← Essay submission + credit deduction
│   │   │   ├── tasks.js      ← Exam question catalogue
│   │   │   ├── admin.js      ← Admin panel endpoints
│   │   │   ├── stripe.js     ← Payments and webhooks
│   │   │   ├── reports.js    ← Graded report retrieval
│   │   │   ├── analytics.js  ← Dashboard charts
│   │   │   ├── discounts.js  ← Discount codes
│   │   │   ├── support.js    ← Support tickets
│   │   │   └── storage.js    ← Profile image uploads
│   │   └── services/
│   │       ├── grader.js     ← AI grading logic (OpenAI prompts) ← GRADING CRITERIA LIVE HERE
│   │       ├── email.js      ← Transactional email (Resend)
│   │       └── supabase.js   ← Database client
│   ├── .env                  ← Local environment variables (never commit this)
│   ├── .env.example          ← Template showing what variables are needed
│   └── fly.toml              ← Fly.io deployment config
│
└── ielts-grader-app/         ← React frontend (deployed on Vercel)
    └── src/
        ├── App.jsx           ← All routes defined here
        ├── services/api.js   ← Every backend API call (single file)
        ├── context/
        │   └── AuthContext.jsx ← Global auth state (user, token, login, logout)
        ├── pages/            ← Page-level components
        ├── components/       ← Shared UI components
        ├── marketing/        ← Landing page sections (Hero, FAQ, etc.)
        └── auth/             ← Login, signup, password reset pages
```

---

## Running Locally

You need to run **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Backend

```bash
cd IELTS_GRADER/backend
```

Create your local environment file:
```bash
cp .env.example .env
```

Open `.env` and fill in the values (get these from the project owner):
```
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=any-long-random-string-for-local-dev

OPENAI_API_KEY=sk-proj-...

GRADING_SECRET=any-random-string-for-local-dev

FRONTEND_URL=http://localhost:5173

# Stripe — subscriptions + new-user promo (create coupon in Dashboard: 50% off, repeating 1 month)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PRICE_WEEKLY_SPRINT=price_...
# STRIPE_PRICE_MONTHLY_MASTERY=price_...
# STRIPE_COUPON_NEW_USER=coupon_...   # required for 50% first-month checkout discount

# Optional — only needed if testing email flows locally
RESEND_API_KEY=re_...
EMAIL_FROM=IELTS Grader <noreply@yourdomain.com>
EMAIL_REPLY_TO=support@yourdomain.com
# Deliverability: verify the sending domain in Resend (SPF + DKIM) and add DMARC.
# EMAIL_FROM must use that verified domain (not Resend's onboarding domain).
# Production must set EMAIL_FROM and EMAIL_REPLY_TO as Fly secrets.
```

Install dependencies and start:
```bash
npm install
node src/index.js
```

You should see:
```
IELTS Grader Backend running on port 5000 [development]
```

The backend is now available at `http://localhost:5000`. You can test it:
```bash
curl http://localhost:5000/health
# → {"status":"ok","timestamp":"..."}
```

### Terminal 2 — Frontend

```bash
cd IELTS_GRADER/ielts-grader-app
```

Create your local environment file:
```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values (get these from the project owner):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Install dependencies and start:
```bash
npm install
npm run dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser. The frontend talks to the local backend automatically (Vite proxies `/api` → `http://localhost:5000`).

---

## How to Make Changes

### Changing Frontend UI or Text

All frontend code lives in `ielts-grader-app/src/`.

| What you want to change | File to edit |
|---|---|
| Landing page headline/text | `src/marketing/Hero.jsx` |
| FAQ content | `src/marketing/FAQ.jsx` |
| Features section | `src/marketing/Features.jsx` |
| How It Works section | `src/marketing/HowItWorks.jsx` |
| Dashboard layout | `src/dashboard/DashboardApp.jsx` |
| Report page | `src/pages/ReportPage.jsx` |
| Pricing page | `src/pages/PricingPage.jsx` |
| Login / Signup pages | `src/auth/LoginPage1.jsx`, `src/auth/SignupPage5.jsx` |
| All API calls to backend | `src/services/api.js` |
| App routes | `src/App.jsx` |

Make your changes, the browser will **hot-reload automatically** — no restart needed.

### Changing Backend Logic

All backend code lives in `backend/src/`.

| What you want to change | File to edit |
|---|---|
| Grading criteria / AI prompts (**Python engine — primary**) | `backend/python/AnswerGrader.py` (Task 2), `Task1LetterGrader.py`, `Task1ReportGrader.py` |
| Grading criteria / AI prompts (JS engine — fallback) | `src/services/grader.js` |
| Email templates | `src/services/email.js` |
| Auth flow (login, register, etc.) | `src/routes/auth.js` |
| Submission / credit logic | `src/routes/submissions.js` |
| Payment / Stripe logic | `src/routes/stripe.js` |
| Admin panel data | `src/routes/admin.js` |
| Exam questions | `src/routes/tasks.js` |

After editing a backend file, **restart the backend process** (Ctrl+C → `node src/index.js` again) for changes to take effect.

### Changing the Grading Criteria (Python engine)

The grading engine used in production is Python, sourced from the client's
own repository — see `backend/python/README.md` for details. Each task type
has its own standalone grader with its prompts embedded in the file:

- **`AnswerGrader.py`** — Task 2 essays. Dual-model scoring (Model A + Model B), per-criterion error detection, revision (model answer), vocabulary, grammar, argumentation, and flow analysis.
- **`Task1LetterGrader.py`** — Task 1 General Training letters.
- **`Task1ReportGrader.py`** — Task 1 Academic reports/charts.

To change what gets graded or how, edit the prompt text inside these files.
The prompts are plain English — no special syntax needed.

> The graders output their own JSON schema; the Node bridge
> (`backend/src/services/pythonGrader.js`, `mapPythonResult()`) converts it
> to what the database and report UI expect. If you add/rename output
> fields, update that mapping too.

**Testing your changes locally:**

```bash
cd backend/python
python -m venv .venv          # first time only
.venv\Scripts\activate         # Windows — macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # fill in OPENAI_API_KEY

python AnswerGrader.py --exam-name "Test" --prompt "Some question..." --user-answer "Some essay..."
```

This prints the full JSON grading report to your terminal — the exact
output the live system produces for a real user submission.

**Switching the backend to use your changes:** set `GRADING_ENGINE=python`
in `backend/.env`, then restart the backend (`node src/index.js`). Set it
back to `GRADING_ENGINE=js` (or remove the line) to instantly roll back to
the previous grading engine if something goes wrong — no code changes
needed, no rebuild, just restart.

> There is also a JS grading engine (`backend/src/services/grader.js`)
> kept in the codebase as an emergency fallback. It is not the one you
> should edit for day-to-day grading criteria changes — it exists purely
> so `GRADING_ENGINE=js` is always available as an instant rollback path.

### Adding a New API Route

1. Add your handler to the appropriate file in `backend/src/routes/` (or create a new file)
2. If you created a new file, register it in `backend/src/index.js`:
   ```js
   const myRoutes = require('./routes/myroute');
   app.use('/api/myroute', myRoutes);
   ```
3. Add the matching API call in `ielts-grader-app/src/services/api.js`

---

## Deploying Changes

### Connecting flyctl to the Fly.io account (one-time setup)

Before you can deploy the backend, the `fly` CLI needs to be authenticated and you need access to the `ielts-grader-backend` app.

1. **Get invited to the Fly.io organization.** Ask the project owner to add your email as a collaborator on the Fly.io org (Fly.io dashboard → Organization → Invite Member). You can't deploy without this.
2. **Log in from your terminal:**
   ```bash
   fly auth login
   ```
   This opens a browser window to sign in / accept the invite. Once done, your terminal session is authenticated.
3. **Confirm you have access to the app:**
   ```bash
   cd IELTS_GRADER/backend
   fly status
   ```
   This should show the `ielts-grader-backend` app's status (machines, region, etc.) without any errors. If you get a "not found" or permission error, you haven't been added to the org yet — go back to step 1.

You only need to do this once per machine you deploy from. After that, `fly deploy` and `fly secrets set` (below) will work directly — the app name is already baked into `backend/fly.toml`, so you don't need to specify it manually.

### Frontend → Vercel (automatic)

Vercel watches the `main` branch. All you need to do is push:

```bash
git add .
git commit -m "describe what you changed"
git push
```

Vercel picks it up automatically and deploys within ~2 minutes. You can watch the build at https://vercel.com/dashboard.

### Backend → Fly.io (manual)

```bash
cd IELTS_GRADER/backend
fly deploy
```

This builds a Docker image and rolls it out to production. Takes ~2–3 minutes. You'll see a success message with the deployed URL. The image includes Python 3 and installs `backend/python/requirements.txt` automatically — no manual setup needed for the grading engine.

To watch live logs after deploying:
```bash
fly logs
```

**Switching production to the Python grading engine:** once you've tested
your Python changes locally and are ready to go live with them:
```bash
fly secrets set GRADING_ENGINE=python
```
This triggers an automatic redeploy. To roll back instantly if anything
goes wrong:
```bash
fly secrets set GRADING_ENGINE=js
```

### Updating Backend Environment Variables

Backend environment variables (API keys, secrets) are stored as Fly.io secrets, not in code. To add or change one:

```bash
fly secrets set VARIABLE_NAME=new_value
```

This triggers an automatic redeploy. Examples:

```bash
fly secrets set OPENAI_API_KEY=sk-proj-new-key
fly secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
fly secrets set STRIPE_PRICE_WEEKLY_SPRINT=price_xxxxxxxxxxxx
fly secrets set STRIPE_COUPON_NEW_USER=coupon_xxxxxxxxxxxx
```

**New-user 50% promo (optional but required for the campaign):** Create a Stripe Coupon named `New user - 50% first month` with **50% off**, duration **Repeating / 1 month** (test + live). Set `STRIPE_COUPON_NEW_USER` to that coupon ID in `backend/.env` and Fly secrets. Without it, checkout charges full price while the UI may still show the sale.

To see all currently set secrets (values are hidden, only names shown):
```bash
fly secrets list
```

---

## Database — Supabase

The database is hosted on Supabase. To make direct data changes or run SQL:

1. Go to https://supabase.com → sign in → open the IELTS Grader project
2. Click **SQL Editor** in the left sidebar → **New Query**
3. Write and run your SQL

Key tables:

| Table | What it stores |
|---|---|
| `profiles` | One row per user — name, email, credits, admin flag |
| `submissions` | Every essay submitted with status (pending / graded / failed) |
| `reports` | Graded results — band scores, feedback, errors, model answer |
| `exam_tasks` | The question bank — questions shown during mock exams |
| `user_question_assignments` | Tracks which question was assigned to which user |
| `payments` | Stripe payment records |
| `discount_codes` | Discount/promo codes |

Common tasks:

```sql
-- Give a user more credits
UPDATE profiles SET credits_remaining = 10 WHERE email = 'user@example.com';

-- Make a user an admin
UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';

-- Add a question to the question bank
INSERT INTO exam_tasks (exam_type, task_type, title, question_text, time_limit_seconds, is_active)
VALUES ('Academic', 'Task 2', 'Technology and Society', 'Some people believe...', 2400, true);

-- Check how many credits a user has
SELECT email, credits_remaining FROM profiles WHERE email = 'user@example.com';
```

---

## Useful Commands Reference

```bash
# ── Frontend ─────────────────────────────────────────────────────
cd ielts-grader-app
npm run dev          # start local dev server
npm run build        # build for production (checks for errors)

# ── Backend ──────────────────────────────────────────────────────
cd backend
node src/index.js    # start local dev server
npm install          # install/update dependencies

# ── Git ──────────────────────────────────────────────────────────
git status           # see what files changed
git add .            # stage all changes
git commit -m "msg"  # commit with a message
git push             # push to GitHub (triggers Vercel deploy)
git pull             # get latest changes from GitHub

# ── Fly.io ───────────────────────────────────────────────────────
cd backend
fly deploy           # deploy backend to production
fly logs             # view live production logs
fly logs -i <id>     # logs for a specific machine
fly secrets list     # list all environment variable names
fly secrets set K=V  # set/update an environment variable
```

---

## Troubleshooting

**Frontend shows "Network Error" or white screen**
- Make sure the backend is running (`node src/index.js` in the `backend/` folder)
- Check the browser console (F12 → Console tab) for errors

**Backend fails to start**
- Check your `.env` file — all required variables must be filled in
- Run `node --check src/index.js` to check for syntax errors

**Changes not showing after deploy**
- Frontend: wait 2 minutes for Vercel, then hard refresh (Ctrl+Shift+R)
- Backend: run `fly logs` to see if the new version started correctly

**"Invalid token" or login loops**
- Clear localStorage: in browser DevTools (F12) → Application → Local Storage → clear all

**Need to see what's happening in production backend**
```bash
fly logs
```
