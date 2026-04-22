# START CREW — Execution Plan

> Build roadmap for the START CREW Streamlit application.
> University of St. Gallen — Grundlagen und Methoden der Informatik, group project.
> Scope is strictly constrained to concepts taught in Weeks 1–11 of the course (see `Claude.md`),
> with **Supabase** authorised as the group-project backend per professor feedback (April 2026).

---

## Stack — authoritative reference

| Layer | Technology | Source of authorisation |
|---|---|---|
| Frontend / UI | **Streamlit** (Python) | W4 — sole permitted web layer |
| Backend data store | **Supabase** (hosted PostgreSQL) via `supabase-py` | W7 + Professor Feedback / April 2026 |
| Authentication | **Supabase Auth** (`supabase.auth.sign_in_with_password`, `sign_up`) | Professor Feedback / April 2026 |
| External API | **`requests`** (W6) — Google Sheets CSV export endpoint |
| Data analysis | `pandas`, `numpy` (W8) |
| Visualisation | `matplotlib.pyplot` + Streamlit built-ins (W9) |
| Machine learning | `scikit-learn` — `LinearRegression`, `train_test_split`, `MinMaxScaler` (W10–W11) |

---

## Ground rules baked into this plan

Every phase below is constrained to what the course has covered (W1–W11 in `Claude.md`):

- **Only these libraries:** `streamlit`, `supabase`, `pandas`, `numpy`, `matplotlib`, `requests`, `scikit-learn`. `sqlite3` is no longer used by the project — it remains on the allowed list for course exercises only.
- **No React, no other frontend framework.** `Claude.md` line 21: *"Keine andere Sprache verwenden. Kein TypeScript/JavaScript"*. Streamlit is the only web layer.
- **No type hints, dataclasses, decorators, `try/except`** (unless unavoidable — e.g. network errors on Supabase calls), **no pathlib, no enums.** `with open()` is allowed only for file I/O.
- **No Supabase Realtime** (WebSockets) — page refresh / `st.rerun()` only. This is explicit in `Claude.md` line 391 + rule 3 of the Supabase rules.
- **No Supabase Storage / Edge Functions** — per `Claude.md` Supabase rules 4 & 5.
- **Credentials via `st.secrets`** (file `.streamlit/secrets.toml`) — never hardcoded, never committed.
- **Python style:** `snake_case`, 4-space indentation, double quotes, German or English comments on every non-trivial block.
- **Multi-page** via Streamlit's built-in `pages/` folder + `st.switch_page`.
- **Matplotlib only** for charts; Streamlit's `st.bar_chart` / `st.line_chart` allowed for simple cases.
- **One file per page + small shared utility modules** — no packages, no `__init__.py`.
- **Defence in depth:** even with Supabase Row Level Security in the dashboard, every Python query still filters by role/team explicitly (`Claude.md` rule 6).

---

## Target file layout

```
CSunicorn/
├── app.py                      # Login page (route "/")
├── pages/
│   ├── 1_Project_Management.py
│   ├── 2_Team_Lead.py
│   ├── 3_Volunteer.py
│   └── 4_Admin.py
├── supa.py                     # Shared supabase client + small query helpers
├── seed_supabase.py            # One-off: seeds demo data via supabase-py
├── brand.py                    # CSS injection + logo + badge helpers
├── auth.py                     # sign_in, sign_up, logout, route_guard (wraps supabase.auth)
├── forecast.py                 # ML: train + predict + write forecasts to Supabase
├── api_import.py               # requests.get(...) → Google Sheets CSV
├── sample_data/
│   ├── historical_shifts.csv   # synthetic training data for ML
│   ├── construction_plan.csv   # demo batch-upload file
│   └── volunteers_roster.csv   # demo roster (simulates the Sheets source)
├── static/
│   ├── avatars/                # uploaded profile pics
│   └── maps/                   # uploaded venue maps
├── .streamlit/
│   └── secrets.toml            # SUPABASE_URL, SUPABASE_KEY (gitignored)
└── requirements.txt            # streamlit, supabase, pandas, numpy, matplotlib, requests, scikit-learn
```

**Removed vs. v1:** `db.py`, `init_db.py`, `startcrew.sqlite`. Replaced by `supa.py` + `seed_supabase.py` + `.streamlit/secrets.toml`.

The existing `app.py` and `model.py` are placeholder scaffolding from the previous iteration and will be replaced in Phase 2.

---

## Database schema — in Supabase

The 8 tables from `02_main_visualizations_content.md` are created once **in the Supabase dashboard** (SQL editor, using the `CREATE TABLE` statements from the schema reference). `seed_supabase.py` then inserts demo rows via `supabase-py`.

`users` table note: we do **not** replicate Supabase's `auth.users`. Instead we create a `profiles` table keyed by `auth.users.id` that holds `name`, `role`, `phone`, `avatar_url`, `team_id`, `is_active`. This is the standard Supabase pattern and keeps Auth fully delegated to Supabase.

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with role, team, phone, avatar, active flag |
| `teams` | `team_id`, `name`, `zone`, `lead_id` |
| `tasks` | `task_id`, `zone`, `task_name`, shift window, `slots_remaining`, `status`, `priority` |
| `assignments` | `assignment_id`, `task_id`, `volunteer_id`, `team_id`, `status` |
| `requests` | `request_id`, `team_id`, `zone`, people_needed, shift window, `status` |
| `notifications` | `notification_id`, `from_user_id`, `to_role`, `to_user_id`, `message`, `is_read` |
| `forecasts` | `forecast_id`, `zone`, `shift_slot`, `predicted_count`, `generated_at` |
| `config` | `key`, `value`, `updated_at` (for venue map path, etc.) |

**Race condition for volunteer commits:** enforced with a Postgres `CHECK (slots_remaining >= 0)` constraint on `tasks` + the supabase-py `.gt("slots_remaining", 0)` filter when claiming a slot.

---

## Phased build plan

### Phase 1 — Foundation (Supabase project, client wrapper, brand, auth)

**Deliverables**

1. **Supabase project setup** (manual, in the dashboard):
   - Create new project, copy URL + anon key into `.streamlit/secrets.toml`.
   - Run the 8 `CREATE TABLE` statements in the SQL editor.
   - Add `CHECK (slots_remaining >= 0)` on `tasks`.
   - Configure Row Level Security policies (read-all for authenticated users on most tables; write scoped by role).
2. `supa.py`: module-level `supabase = create_client(st.secrets["SUPABASE_URL"], st.secrets["SUPABASE_KEY"])`. Small helper functions only — `select_all(table, filters=None)`, `insert(table, row)`, `update(table, row_id, patch)`. Nothing fancy.
3. `seed_supabase.py`: one-off script — creates 1 admin, 1 PM, 3 leads, ~15 volunteers via `supabase.auth.sign_up(...)` then inserts matching `profiles` rows, 7 zones, demo tasks. Idempotent via `.upsert()` on email.
4. `brand.py`: `apply_brand()` injecting the CSS from `04_brand_guidelines.md`, plus `render_logo()`, `badge(label, variant)`, `nav_bar(role)`.
5. `auth.py`: `sign_in(email, pw)`, `sign_up(email, pw, role)`, `logout()`, `route_guard(allowed_roles)`. Delegates auth entirely to `supabase.auth`; stores `access_token` + profile fields in `st.session_state`.

**Grading hooks:** #2 (database + Auth), #6 (comments on every module).

---

### Phase 2 — Login + routing (`app.py`)

**Deliverables**

1. Login page with centred wordmark, email + password inputs, inline error.
2. On submit → `supabase.auth.sign_in_with_password({"email": e, "password": p})`. On 200, fetch the matching row from `profiles` and check `is_active`.
3. Set `st.session_state` keys: `role`, `user_id`, `team_id`, `name`, `avatar_url`, `access_token`.
4. `st.switch_page` to the appropriate `pages/*.py` based on role.
5. Logout button (in nav bar) clears `st.session_state` and calls `supabase.auth.sign_out()`.

**Grading hooks:** #4 (interaction), #2 (Auth).

---

### Phase 3 — Volunteer page (`pages/3_Volunteer.py`)

Simplest role, end-to-end — proves the data layer works.

**Deliverables**

1. Profile strip — avatar (`st.image`), name, status badge (AVAILABLE yellow / ASSIGNED green).
2. Sector map — 7-zone grid via `st.columns`, each tile a coloured `st.markdown` block. Colour from `staffed / required` ratio pulled from `assignments` + `tasks`.
3. Open jobs feed — cards sorted by urgency. Each card: commit button (yellow) and `tel:` call link (only rendered after commit).
4. Commit logic — two-step:
   - `supabase.table("tasks").update({"slots_remaining": <new>}).eq("task_id", id).gt("slots_remaining", 0).execute()` — the `.gt` guard + the `CHECK` constraint together prevent race conditions.
   - On success: `supabase.table("assignments").insert({...}).execute()`. If the update returns 0 rows affected, the slot was just taken — show "Taken" and refresh.
5. Enforce one active task per volunteer via a pre-commit `SELECT` on `assignments` with `status='assigned'`.

**Grading hooks:** #4 (interaction), #3 (sector map viz).

---

### Phase 4 — Team Lead page (`pages/2_Team_Lead.py`)

**Deliverables**

1. Updates feed — unread notifications bolded; click marks `is_read=True`.
2. Team roster grid for current shift, scoped by `team_id` on the client side (defence in depth, even with RLS).
3. Daily task checklist — `st.checkbox` per task; ticking sets `tasks.status='complete'`.
4. OKR panel — computed live (stage completion %, crew utilisation %, requests closed). Never stored.
5. Request People form — inserts into `requests` with `status='open'`.
6. Below form: lead's own submitted requests with status badge.

**Grading hooks:** #4, #3, #2.

---

### Phase 5 — Project Management page (`pages/1_Project_Management.py`)

**Deliverables**

1. Four stat cards in a row (active volunteers, open requests, tasks complete %, coverage %).
2. Progress bars per zone — matplotlib horizontal bars coloured by threshold.
3. Outstanding requests list sorted Critical → Warning → Filled; resolve button per row.
4. Add-single-task form.
5. Notification composer — to all leads or a specific lead; log of sent notifications below.

**Grading hooks:** #3 (viz), #4 (interaction), #2 (reads across all teams).

---

### Phase 6 — ML forecast (`forecast.py` + chart on PM page)

This is the grading linchpin for criterion #5. We stay firmly inside W10–W11.

**Deliverables**

1. `sample_data/historical_shifts.csv` — synthetic data: for each past build week × zone × 2h slot, columns `day_of_week, zone, shift_slot, tasks_in_zone, historical_avg_attendance, actual_headcount`.
2. `forecast.py`:
   - Loads the CSV with pandas, one-hot encodes `zone` manually into 0/1 columns (no `OneHotEncoder` — that would be pipeline territory).
   - `train_test_split(test_size=0.30, random_state=42)`.
   - `LinearRegression().fit(X_train, y_train)` — simplest course-taught model, avoids RandomForest (not on the allowed list).
   - Predicts headcount per zone × slot for "today".
   - Writes results via `supabase.table("forecasts").upsert(...)` — one row per zone×slot with a fresh `generated_at`.
   - Reports `clf.score(X_test, y_test)` (R²) as the evaluation metric — basic sklearn API, no extras.
3. Chart on PM page — matplotlib grouped bar: yellow filled bars = actual, yellow outlined bars = predicted, red bars = shortage, 40% alpha for future slots.

**Grading hooks:** #5 (ML), #3 (chart).

---

### Phase 7 — Admin page (`pages/4_Admin.py`)

**Deliverables**

1. User management table with role-colour badges; add/edit forms; deactivate (soft delete, `profiles.is_active=False`). New users created via `supabase.auth.sign_up(...)` + `profiles` insert.
2. Venue map upload via `st.file_uploader` → bytes written to `static/maps/current_map.<ext>`, path stored in `config` table via upsert.
3. Batch task upload — `st.file_uploader` (CSV/XLSX), parsed with pandas. Validate required columns, preview first 10 rows, confirm button → `supabase.table("tasks").insert([...]).execute()` (bulk). Row-level errors shown before commit.

**Grading hooks:** #4, #2.

---

### Phase 8 — External API integration (`api_import.py`)

Covers grading criterion #2 "API + DB" with a course-taught approach.

**Deliverables**

1. Function `fetch_roster_from_sheets(sheet_csv_url)` calls `requests.get(url)`, checks `status_code == 200`, parses with `pd.read_csv(io.StringIO(response.text))`.
   - Rationale: Google Sheets exposes any sheet as CSV via `export?format=csv` — that is a pure W6 `requests` pattern, no Sheets API SDK needed.
2. Button in Admin page: "Import volunteers from Sheets" → calls the function, then for each row calls `supabase.auth.sign_up(...)` + `profiles.upsert(...)`. Existing emails are skipped.
3. For the demo video we point it at a public Google Sheet we control; for local dev it falls back to reading `sample_data/volunteers_roster.csv`.

**Grading hooks:** #2 (API).

---

### Phase 9 — Polish, docs, video prep

**Deliverables**

1. Contribution matrix — written into a `CONTRIBUTIONS.md` file only if the user confirms (otherwise leave it as the table already in `01_idea_description.md`).
2. Pass over every module to ensure "well documented by comments" as the grading rubric requires — short comments on every non-trivial block.
3. Smoke-test all four flows with the seeded data, in multiple browser tabs (to prove the multi-user / distributed-system story the professor asked for).
4. Update `requirements.txt` only if new packages were added (currently it already lists everything we need).
5. Notes for the 4-minute video walkthrough: Login → Volunteer commit (shown in a second tab live-updating) → Lead requests people → PM dashboard + ML forecast → Admin CSV import.

---

## Key design decisions that need sign-off before Phase 1

1. **Frontend stays Streamlit.** `Claude.md` does not permit React/JS. If the group wants to switch to React, `Claude.md` and `01_idea_description.md` need to be updated first (and the professor likely re-consulted, since it goes beyond the Supabase-only pivot that was explicitly approved).
2. **Auth via Supabase Auth, not custom hashing.** Previous plan used `hashlib.sha256` against a local `users` table — now we delegate fully to `supabase.auth` per `Claude.md` line 389.
3. **Linear Regression over RandomForestRegressor.** `RandomForestRegressor` isn't in the W10 allowed list in `Claude.md`.
4. **Google Sheets CSV URL over Airtable SDK.** The Airtable SDK isn't course-taught; the `requests.get(sheet_csv_url)` path fits W6 exactly.
5. **Synthetic historical shift data.** No real past Start Summit data exists in the repo, so we generate a plausible CSV the model can train on.
6. **Streamlit's built-in `pages/` directory** for multi-page routing — W4 pattern.
7. **No Supabase Realtime / Storage / Edge Functions.** Everything is plain REST + `st.rerun()`, per the Supabase rules in `Claude.md`.
8. **Branch strategy** — currently on `main` after merge. Open question: one branch per phase (9 total, small PRs, incremental review) vs. keep everything on `main` / one long-running feature branch.
