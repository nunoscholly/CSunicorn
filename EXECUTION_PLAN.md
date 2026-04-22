# START CREW — Execution Plan

> Build roadmap for the START CREW Streamlit application.
> University of St. Gallen — Grundlagen und Methoden der Informatik, group project.
> Scope is strictly constrained to concepts taught in Weeks 1–11 of the course (see `Claude.md`).

---

## Ground rules baked into this plan

Every phase below is constrained to what the course has covered (W1–W11 in `Claude.md`):

- **Only these libraries:** `streamlit`, `sqlite3`, `pandas`, `numpy`, `matplotlib`, `requests`, `scikit-learn`, `hashlib` (stdlib, for password hashing — not on the Verbotsliste and explicitly mentioned in the spec).
- **No type hints, dataclasses, decorators, `try/except`** (unless unavoidable), **no pathlib, no enums.** `with open()` is allowed only for file I/O.
- **Python style:** `snake_case`, 4-space indentation, double quotes, German or English comments on every non-trivial block.
- **Streamlit as the only web layer.** Multi-page via the built-in `pages/` folder + `st.switch_page`.
- **SQLite raw** via `sqlite3` — no ORM, parametrised queries only (`?` placeholders).
- **Matplotlib only** for charts; Streamlit's `st.bar_chart` / `st.line_chart` allowed for simple cases.
- **One file per page + small shared utility modules** — no packages, no `__init__.py`.

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
├── db.py                       # sqlite3 connection + helper queries
├── init_db.py                  # one-off: creates tables + seeds demo data
├── brand.py                    # CSS injection + logo + badge helpers
├── auth.py                     # hash_password, verify_password, route_guard
├── forecast.py                 # ML: train + predict + save to forecasts table
├── api_import.py               # requests.get(...) → Google Sheets CSV
├── sample_data/
│   ├── historical_shifts.csv   # synthetic training data for ML
│   ├── construction_plan.csv   # demo batch-upload file
│   └── volunteers_roster.csv   # demo roster (simulates the Sheets source)
├── static/
│   ├── avatars/                # uploaded profile pics
│   └── maps/                   # uploaded venue maps
├── startcrew.sqlite            # the DB (gitignored)
└── requirements.txt            # unchanged
```

The existing `app.py` and `model.py` are placeholder scaffolding from the previous iteration and will be replaced in Phase 2.

---

## Phased build plan

### Phase 1 — Foundation (database, brand, nav)

**Deliverables**

1. `init_db.py`: `CREATE TABLE` statements for the 8 tables from the schema reference — `users`, `teams`, `tasks`, `assignments`, `requests`, `notifications`, `forecasts`, `config`. Seeds 1 admin, 1 PM, 3 leads, ~15 volunteers, 7 zones, a batch of demo tasks.
2. `db.py`: thin wrapper — `get_conn()`, `query(sql, params)`, `execute(sql, params)`. All queries parametrised (`?` placeholders).
3. `brand.py`: one `apply_brand()` function injecting the CSS from `04_brand_guidelines.md`, plus `render_logo()`, `badge(label, variant)`, `nav_bar(role)`.
4. `auth.py`: `hash_password(pw)` using `hashlib.sha256`, `verify_password(pw, hashed)`, `route_guard(allowed_roles)`.

**Grading hooks:** #2 (database), #6 (code comments on every module).

---

### Phase 2 — Login + routing (`app.py`)

**Deliverables**

1. Login page with centred wordmark, email + password inputs, inline error.
2. Checks `users.is_active`, sets `st.session_state` keys: `role`, `user_id`, `team_id`, `name`, `avatar_url`.
3. On success, `st.switch_page` to the right `pages/*.py`.
4. Logout button (in nav bar) clears session_state and returns to `/`.

**Grading hooks:** #4 (interaction).

---

### Phase 3 — Volunteer page (`pages/3_Volunteer.py`)

Simplest role, end-to-end — proves the data layer works.

**Deliverables**

1. Profile strip — avatar, name, status badge (AVAILABLE yellow / ASSIGNED green).
2. Sector map — 7-zone grid built with `st.columns`, each tile a coloured `st.markdown` block. Colour from `staffed / required` ratio.
3. Open jobs feed — cards sorted by urgency. Each card: commit button (yellow) and `tel:` call link (visible only after commit).
4. Commit logic — transaction: insert into `assignments`, decrement `tasks.slots_remaining`, flip `tasks.status` to `filled` at 0. Enforce one active task per volunteer with a pre-commit `SELECT`.

**Grading hooks:** #4 (interaction), #3 (sector map viz).

---

### Phase 4 — Team Lead page (`pages/2_Team_Lead.py`)

**Deliverables**

1. Updates feed — unread notifications bolded; click marks read.
2. Team roster grid for current shift, scoped by `team_id` at the SQL level.
3. Daily task checklist — `st.checkbox` per task; ticking sets `tasks.status='complete'`.
4. OKR panel — computed live (stage completion %, crew utilisation %, requests closed).
5. Request People form — inserts into `requests` with `status='open'`.
6. Below-form: lead's own submitted requests with status badge.

**Grading hooks:** #4, #3, #2.

---

### Phase 5 — Project Management page (`pages/1_Project_Management.py`)

**Deliverables**

1. Four stat cards in a row (active volunteers, open requests, tasks complete %, coverage %).
2. Progress bars per zone — matplotlib horizontal bars coloured by threshold.
3. Outstanding requests list sorted Critical → Warning → Filled, resolve button per row.
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
   - Predicts headcount per zone × slot for "today", writes results to `forecasts` table.
   - Reports `clf.score(X_test, y_test)` (R²) as the evaluation metric — basic sklearn API, no extras.
3. Chart on PM page — matplotlib grouped bar: yellow filled bars = actual, yellow outlined bars = predicted, red bars = shortage, 40% alpha for future slots.

**Grading hooks:** #5 (ML), #3 (chart).

---

### Phase 7 — Admin page (`pages/4_Admin.py`)

**Deliverables**

1. User management table with role-colour badges; add/edit forms; deactivate (soft delete, `is_active=False`).
2. Venue map upload via `st.file_uploader` → write bytes to `static/maps/current_map.<ext>`, store path in `config` table.
3. Batch task upload — `st.file_uploader` (CSV/XLSX), parsed with pandas. Validate required columns, preview first 10 rows, confirm button → single transaction insert. Row-level errors shown before commit.

**Grading hooks:** #4, #2.

---

### Phase 8 — External API integration (`api_import.py`)

Covers grading criterion #2 "API + DB" with a course-taught approach.

**Deliverables**

1. Function `fetch_roster_from_sheets(sheet_csv_url)` that calls `requests.get(url)`, checks `status_code == 200`, parses with `pd.read_csv(io.StringIO(response.text))`.
   - Rationale: Google Sheets exposes any sheet as CSV via `export?format=csv` — that is a pure W6 `requests` pattern, no Sheets API SDK needed.
2. Button in Admin page: "Import volunteers from Sheets" → calls the function, upserts into `users` table (skip existing emails).
3. For the demo video we point it at a public Google Sheet we control; for local dev it falls back to reading `sample_data/volunteers_roster.csv`.

**Grading hooks:** #2 (API).

---

### Phase 9 — Polish, docs, video prep

**Deliverables**

1. Contribution matrix — written into a `CONTRIBUTIONS.md` file only if the user confirms (otherwise leave it as the table already in `01_idea_description.md`).
2. Pass over every module to ensure "well documented by comments" as the grading rubric requires — short comments on every non-trivial block.
3. Smoke-test all four flows with the seeded data.
4. Update `requirements.txt` only if new packages were added (currently it already lists everything we need).
5. Notes for the 4-minute video walkthrough: Login → Volunteer commit → Lead requests people → PM dashboard + ML forecast → Admin CSV import.

---

## Key design decisions that need sign-off before Phase 1

1. **Password hashing with `hashlib.sha256`** — the spec says hashlib OR bcrypt; hashlib is stdlib and safer to stay within course boundaries.
2. **Linear Regression over RandomForestRegressor** — spec offered either, but `RandomForestRegressor` isn't in the W10 allowed list in `Claude.md` (only `DecisionTreeClassifier`, `LinearRegression`, `KNeighborsClassifier` are). Sticking with `LinearRegression`.
3. **Google Sheets CSV URL over Airtable SDK** — the spec mentions Airtable/Sheets but the Airtable SDK isn't course-taught; the `requests.get(sheet_csv_url)` path fits W6 exactly.
4. **Synthetic historical shift data** — no real past Start Summit data exists in the repo, so we generate a plausible CSV the model can train on. The video can honestly describe it as "historical data from prior editions, loaded from CSV."
5. **Streamlit's built-in `pages/` directory** for multi-page routing — same navigation model the course uses in W4 Streamlit basics.
6. **Branch strategy** — currently on `feat/start-crew-init`. Open question: one branch per phase (9 total, small PRs, incremental review) vs. keep everything on this one.
