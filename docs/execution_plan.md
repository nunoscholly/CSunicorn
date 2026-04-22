# START CREW — Execution Plan

> Build roadmap for the START CREW application.
> University of St. Gallen — Grundlagen und Methoden der Informatik, group project.
> Deadline: 14 May 2026 on Canvas.

---

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend / UI | **Next.js 14** (App Router), TypeScript, Tailwind | Proper multi-user app with routing, SSR, auth — addresses professor's Streamlit concerns |
| Database & Auth | **Supabase** (PostgreSQL + Auth + RLS) | Cloud-hosted, multi-user, built-in auth — professor-approved pivot |
| ML service | **Python 3** — scikit-learn, pandas, numpy, matplotlib | Course-constrained (W8–W11). Writes predictions to Supabase directly |
| External API | **`requests`** (Python, W6) or Next.js `fetch` | Google Sheets CSV export for roster import |

---

## Ground Rules

- **Python code** must use only course-taught concepts (see docs/course_constraints.md)
- **Next.js code** has no such restriction — use modern TypeScript, proper patterns
- **Credentials** via `.env.local` (Next.js) and `ml/.env` (Python) — never committed
- **No Supabase Realtime** (WebSockets) — use page refresh / `router.refresh()`
- **No Supabase Storage / Edge Functions** — files stored locally or via upload
- **Defense in depth:** every query filters by role/team, even with RLS

---

## Phased Build Plan

### Phase 1 — Foundation (Supabase + Next.js scaffold + Python env)

1. **Supabase project setup** (manual, in dashboard):
   - Create project, copy URL + anon key into `.env.local`
   - Run CREATE TABLE statements (see docs/database_schema.md)
   - Add CHECK constraints, configure RLS policies
2. **Next.js project init:**
   - `create-next-app` with App Router, TypeScript, Tailwind
   - Install `@supabase/ssr`, `@supabase/supabase-js`
   - Set up Supabase client (browser + server) in `lib/supabase/`
   - Middleware for session refresh
3. **Python ML environment:**
   - `ml/requirements.txt`: supabase, pandas, numpy, scikit-learn, matplotlib, requests, python-dotenv
   - `ml/.env` with SUPABASE_URL, SUPABASE_KEY (service_role for writes)
4. **Seed script:** `ml/seed_supabase.py` — creates demo users, teams, tasks
5. **Brand setup:** Tailwind config with START CREW colors, global CSS with dark theme

**Grading hooks:** #2 (database + Auth), #6 (comments)

---

### Phase 2 — Auth + Login + Routing

1. Login page with centered START CREW wordmark, email + password
2. `supabase.auth.signInWithPassword()` → fetch profile → determine role
3. Middleware-based route protection for `/dashboard/*`
4. Role-based redirect after login (admin→admin, pm→project, lead→lead, volunteer→volunteer)
5. Logout: clear session, redirect to login
6. Layout with persistent nav bar (role-gated links)

**Grading hooks:** #4 (interaction), #2 (Auth)

---

### Phase 3 — Volunteer Page

Simplest role, proves the full data flow.

1. Profile strip — name, avatar, status badge (Available / Assigned)
2. Sector map — 7-zone color-coded grid (red < 50% / yellow 50–89% / green ≥ 90%)
3. Open jobs feed — cards sorted by urgency, each with commit button
4. Commit logic — update `slots_remaining` with `.gt("slots_remaining", 0)` guard + insert assignment
5. One active task per volunteer (pre-commit check)
6. Call team lead — `tel:` link (only visible after commit)

**Grading hooks:** #4 (interaction), #3 (sector map viz)

---

### Phase 4 — Team Lead Page

1. Updates feed — unread notifications from PM, click to mark read
2. Team roster for current shift (scoped by team_id)
3. Daily task checklist — checkbox marks `tasks.status = 'complete'`
4. OKR panel — computed live (stage completion %, crew utilisation %, requests closed)
5. Request People form → inserts into `requests`
6. Own submitted requests with status badges

**Grading hooks:** #4, #3, #2

---

### Phase 5 — PM Dashboard

1. Four stat cards (active volunteers, open requests, tasks complete %, coverage %)
2. Progress bars per zone — color-coded by threshold
3. Outstanding requests list — sorted Critical → Warning → Filled, resolve button
4. Add single task form
5. Notification composer — to all leads or specific lead

**Grading hooks:** #3 (viz), #4 (interaction), #2 (reads across all teams)

---

### Phase 6 — ML Forecast

Grading linchpin for criterion #5. Stays inside W10–W11 constraints.

1. `ml/sample_data/historical_shifts.csv` — synthetic training data
2. `ml/forecast.py`:
   - Load CSV with pandas
   - One-hot encode zones manually (no OneHotEncoder)
   - `train_test_split(test_size=0.30, random_state=42)`
   - `LinearRegression().fit(X_train, y_train)`
   - Predict headcount per zone × slot
   - Write results to `forecasts` table via supabase-py
   - Report R² score
3. Forecast chart on PM Dashboard — grouped bar chart rendered via Next.js (Chart.js or similar)

**Grading hooks:** #5 (ML), #3 (chart)

---

### Phase 7 — Admin Page

1. User management table with role badges; add/edit/deactivate forms
2. Venue map upload → save to `public/maps/`, path in `config` table
3. Batch task upload — CSV parsed client-side, validated, preview, bulk insert to Supabase

**Grading hooks:** #4, #2

---

### Phase 8 — External API Integration

Covers grading criterion #2 "API + DB".

1. Google Sheets CSV export URL → `fetch()` in Next.js API route (or `requests.get()` in Python)
2. Parse with pandas or client-side
3. Button in Admin page: "Import volunteers from Sheets" → upsert profiles
4. Fallback to local CSV for dev

**Grading hooks:** #2 (API)

---

### Phase 9 — Polish, Docs, Video Prep

1. Comment pass on all Python modules (grading requirement)
2. Contribution matrix (in docs or repo)
3. Smoke-test all four flows in multiple browser tabs (multi-user demo)
4. Update dependencies / requirements.txt
5. Video walkthrough notes: Login → Volunteer commit → Lead request → PM dashboard + forecast → Admin import

---

## Key Design Decisions

1. **Next.js replaces Streamlit.** Addresses professor's multi-user concerns. Supabase remains as approved.
2. **Auth via Supabase Auth.** No custom password hashing.
3. **LinearRegression over RandomForest.** RandomForest isn't in the W10 allowed list.
4. **Google Sheets CSV URL over SDK.** Plain `fetch`/`requests.get` fits W6 pattern.
5. **Synthetic historical data.** No real past data exists — generate plausible CSV.
6. **Python writes to Supabase, Next.js reads.** No direct Python↔Next.js communication needed.
7. **No Supabase Realtime / Storage / Edge Functions.** Plain REST + page refresh.
