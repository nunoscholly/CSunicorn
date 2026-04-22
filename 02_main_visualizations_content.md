# START CREW — Main Visualisations & Content

> Information architecture for all 5 pages of the START CREW Streamlit application.  
> Each section defines: purpose · content · features · data sources · developer notes.

---

## Application Structure

```
/           Login
/project    Project Management  (PM, Admin)
/lead       Team Lead           (Lead, Admin)
/volunteer  Volunteer           (Volunteer, Admin)
/admin      Admin               (Admin only)
```

Navigation is role-gated. Users only see the nav links matching their role. The nav bar and logout button are persistent across all authenticated views.

---

## Global Components

### Navigation bar
- Persistent across all authenticated views — not shown on the login page
- START CREW double-wedge logo, left-aligned
- Nav links: only views accessible to the current role are shown
- Active page highlighted in Signal Yellow (`#F5C800`)
- Logout button right-aligned — clears `st.session_state` and returns to `/`

### Status badges

| Badge | Colour | Used for |
|---|---|---|
| Critical / Urgent | Red | Understaffed zones, open requests < 50% coverage |
| Warning | Yellow | Partially staffed, 50–89% coverage |
| Staffed / OK | Green | Fully staffed zones and filled requests |
| Available | Yellow pill | Volunteer has no active task |
| Assigned | Green pill | Volunteer is committed to a task |
| Taken | Grey | Job slot is full — no more commits accepted |

---

## Page 0 — Login

**Route:** `/`  
**Roles:** All users

### Purpose
Entry point for all users. Authenticates credentials against the database, checks account status, and routes each user to their role-specific view. No content from other views is visible before authentication.

### Content & Features

| Type | Feature |
|---|---|
| Display | START CREW double-wedge wordmark centred above the form |
| Input | Email field + password field |
| Action | Login button — triggers credential validation against `users` table |
| Logic | Check `is_active = True` — show "Account deactivated, contact admin" error if false |
| Logic | Set `st.session_state`: `role` · `user_id` · `team_id` · `name` · `avatar_url` |
| Routing | `admin` → Admin · `pm` → Project Mgmt · `lead` → Team Lead · `volunteer` → Volunteer |
| Error | Inline error message on failed login — do not clear the email field on failure |

### Developer Notes
- Store hashed passwords — never plaintext. Use `hashlib` or `bcrypt`.
- Session state persists across Streamlit page navigation. Clear all keys on logout.
- Every other page must check `st.session_state["role"]` at the very top and redirect if not set. Do not render any content before this check.

---

## Page 1 — Project Management

**Route:** `/project`  
**Roles:** PM, Admin  
**Grading criteria:** #3 (data viz), #5 (ML), #4 (interaction), #2 (API/DB)

### Purpose
The operational command centre. The project manager monitors real-time staffing, ML demand forecasts, zone-level progress, and outstanding requests. They can add individual tasks and push notification updates to team leads. This is the primary view for demonstrating the ML and data visualisation grading criteria.

---

### 1.1 Key Metrics — Stat Cards

Four cards displayed in a row at the top of the page.

| Metric | Data source | Display |
|---|---|---|
| Active volunteers | `COUNT(*) FROM users WHERE is_active=True AND status IN ('available','assigned')` | Yellow value, muted label |
| Open requests | `COUNT(*) FROM requests WHERE status IN ('open','partial')` | Red if > 0 |
| Tasks complete % | `completed_tasks / total_tasks × 100` | Yellow value |
| Coverage today % | `staffed_slots / required_slots × 100` across all zones | Red if < 70% |

---

### 1.2 ML Workforce Forecast Chart

The primary machine learning visualisation.

**Chart type:** Grouped bar chart  
**X-axis:** Time slots — 07:00, 09:00, 11:00, 13:00, 15:00, 17:00, 19:00, 21:00 (2h intervals)  
**Y-axis:** Headcount  

**Visual encoding:**
- Yellow bars = actual headcount (past/current slots)
- Outlined yellow bars = ML-predicted headcount (all slots)
- Red bars = shortage — actual < 50% of predicted
- Future slots rendered at 40% opacity to distinguish prediction from live data

**Legend:** Actual · Forecast · Shortage

**ML model specification:**

| Field | Detail |
|---|---|
| Model type | Regression or time-series (e.g. `sklearn` `RandomForestRegressor` or `LinearRegression`) |
| Training data | Historical shift records from past Start Summit build weeks |
| Input features | `shift_slot` · `zone` · `day_of_week` · `tasks_in_zone` · `historical_avg_attendance` |
| Output | `predicted_headcount` per zone per 2h slot |
| Storage | `forecasts` table: `zone, shift_slot, predicted_count, generated_at` |
| Refresh | Regenerated on each project management page load |

---

### 1.3 Progress Tracking

**Display:** One horizontal progress bar per zone

**Zones:** Stage A · Stage B · Catering · Entrance · Backstage · AV/Tech · Main Hall

**Colour thresholds:**
- Green: ≥ 80% complete
- Yellow: 50–79% complete  
- Red: < 50% complete

**Data:** `SELECT COUNT(*) FROM tasks WHERE zone=? AND status='complete'` / total tasks per zone  
**Note:** Computed on the fly — not stored. Recalculated on every page load.

---

### 1.4 Outstanding Requests

**Display:** List of all open manpower requests, sorted by priority

**Sort order:** Critical → Warning → Filled

**Each row shows:**
- Zone name
- People needed
- Shift time window
- Status badge (Critical / Warning / Filled)

**Actions:**
- PM can mark any request as resolved / closed
- Status updates in real time in the team lead view

**Data:** `requests` table joined with `zones` — all teams visible to PM (no team_id scoping)

---

### 1.5 Task Upload

**Single task form fields:**

| Field | Type |
|---|---|
| Zone | Dropdown from `zones` table |
| Task name | Text input |
| Shift start | Time picker |
| Shift end | Time picker |
| People needed | Integer input |
| Skills | Free text |
| Priority | Dropdown: Critical / Warning / Normal |
| Description | Text area |

**On submit:** Inserts into `tasks` with `status = 'open'`, `created_by = current user_id`

**Below form:** Last 10 tasks added, with inline edit option

---

### 1.6 Notifications — Push to Leads

**Compose form:**
- Recipient: All leads / specific lead (dropdown)
- Message: Text area

**On send:** Inserts into `notifications`: `from_user_id · to_role · to_user_id · message · created_at · is_read=False`

**Log:** Sent notifications visible to PM — timestamped, with recipient label

**Note:** No push technology needed — Streamlit polls the DB on page refresh. Team lead view queries `notifications` for unread items on load.

---

## Page 2 — Team Lead

**Route:** `/lead`  
**Roles:** Lead, Admin  
**Grading criteria:** #4 (interaction), #3 (data viz), #2 (API/DB)

### Purpose
The team lead's operational interface, scoped entirely to their zone. Updates from project management, their shift roster, daily task checklist and OKR metrics, and a form to request additional people. All data is filtered by `team_id` at the SQL level.

---

### 2.1 Updates Feed

**Display:** Chronological list of notification messages from PM

**Each item:**
- Colour dot: Red = urgent · Yellow = warning · Green = info
- Message text
- Timestamp (relative: "10 min ago")
- Unread indicator (bold)

**Action:** Clicking marks as read — sets `is_read = True` in `notifications` table

**Data filter:** `WHERE to_role = 'lead' OR to_user_id = {current_user_id}`

---

### 2.2 Team Roster — Shift View

**Display:** Grid of assigned team members for current shift

**Each member card:**
- Avatar circle (initials)
- Name
- Role label

**Empty slots:** Dashed border placeholder with + icon for unfilled positions

**Coverage bar:** Staffed count / required count per shift, colour-coded (same thresholds as PM view)

**Data:** `assignments` table joined with `users`, filtered by `team_id` + current shift

---

### 2.3 Daily Task Checklist + OKR

**Task list:**

| Element | Behaviour |
|---|---|
| Task name | Displayed as label |
| Zone / location | Shown as sub-label |
| Scheduled time | Shown inline |
| Checkbox | Lead taps to mark complete → sets `tasks.status = 'complete'` |
| Completed tasks | Strikethrough + muted colour |

**OKR panel** (computed live, not stored):

| OKR | Formula |
|---|---|
| Stage completion % | `completed tasks / total tasks in zone × 100` |
| Crew utilisation % | `assigned volunteers / required headcount for zone × 100` |
| Requests closed | `filled requests / total requests posted by this lead` |

---

### 2.4 Request People Form

| Field | Type | Notes |
|---|---|---|
| Zone / Area | Dropdown | Pre-filled with lead's zone, editable |
| People needed | Integer | Min 1 |
| Shift start | Time picker | |
| Shift end | Time picker | |
| Skills required | Free text | |
| Notes | Text area | Optional — e.g. "bring safety harness" |

**On submit:** Inserts into `requests`:  
`team_id · zone · people_needed · shift_start · shift_end · skills · notes · status='open' · created_at`

**Below form:** Lead's submitted requests with current status badge

### Developer Notes
- Every query on this page must filter by `team_id = st.session_state["team_id"]`. Apply at SQL level — never rely on the UI to hide other teams' data.
- OKR values are computed on the fly — never store them. Recalculate on every page load.

---

## Page 3 — Volunteer

**Route:** `/volunteer`  
**Roles:** Volunteer, Admin  
**Grading criteria:** #4 (interaction), #3 (data viz), #2 (API/DB)

### Purpose
The volunteer's personal interface. Shows where help is needed via a colour-coded sector map, open jobs with descriptions and contact details, a one-tap commit button, and a direct call link to the team lead.

---

### 3.1 Profile Strip

Displayed at the top of the page above all other content.

| Element | Source |
|---|---|
| Avatar circle | `users.avatar_url` — initials fallback if no photo |
| Name | `users.name` |
| Status badge | `AVAILABLE` (yellow) if no active task · `ASSIGNED` (green) if committed |
| Active task name | Shown if `status = 'assigned'` |

---

### 3.2 Venue Sector Map

**Format:** Colour-coded tile grid — not a fully interactive map

**Each tile shows:**
- Zone name
- Staffed count / required count (e.g. "3 / 6 staffed")

**Colour logic:**

| Ratio | Colour | Label |
|---|---|---|
| < 50% | Red | Critical |
| 50–89% | Yellow | Partial |
| ≥ 90% | Green | Staffed |
| Closed | Grey | Closed this shift |

**Zones:** Stage A · Stage B · Catering · Entrance · Backstage · AV/Tech · Main Hall

**Data:** Live count from `assignments` table joined with `tasks`, per zone per current shift  
**Threshold:** `staffed_count / required_count` — computed on load

---

### 3.3 Open Jobs Feed

**Displayed as cards, sorted by urgency (critical first)**

**Each job card includes:**

| Element | Detail |
|---|---|
| Job name | `tasks.task_name` |
| Zone | `tasks.zone` |
| Shift time | `tasks.shift_start – tasks.shift_end` |
| Description | `tasks.description` |
| Slots remaining | `tasks.slots_remaining` |
| Urgency badge | Critical / 1 slot / Open |
| Point of contact | Team lead avatar + name |
| Commit button | Yellow — assigns volunteer to task |
| Call button | Green — `tel:` link using `lead.phone` |

**Commit action logic:**
1. Set `assignments.status = 'assigned'`
2. Decrement `tasks.slots_remaining`
3. If `slots_remaining == 0` → set `tasks.status = 'filled'`
4. Update volunteer `status = 'assigned'`

**Fully taken jobs:** Greyed-out card with disabled "Taken" button

**Constraints:**
- One active task per volunteer at a time — enforce with DB constraint or session check
- Lead phone number only exposed to volunteers who have committed to that lead's task
- Volunteer cannot see other volunteers' profiles

### Developer Notes
- **Race condition risk:** Two volunteers committing simultaneously can push `slots_remaining` negative. Use a DB transaction or `CHECK (slots_remaining >= 0)` constraint.
- **Call feature:** `st.markdown(f'<a href="tel:{phone}">Call {name}</a>', unsafe_allow_html=True)` — browser handles the call intent, no backend needed.
- **Profile photo:** Save uploads to `/static/avatars/`. Render via `st.image(avatar_url, width=80)`. Always have an initials fallback.

---

## Page 4 — Admin

**Route:** `/admin`  
**Roles:** Admin only  
**Grading criteria:** #4 (interaction), #2 (API/DB)

### Purpose
Back-office control panel for pre-event configuration and ongoing system management. Used primarily before the build week. Not a day-to-day view.

---

### 4.1 User Management

**Table view:** avatar · name · email · role badge · active status

**Role tag colours:**
- Admin: Green
- PM: Yellow  
- Team Lead: Purple
- Volunteer: Blue

**Actions:**

| Action | Fields |
|---|---|
| Add user | name · email · password · role · phone · team_id |
| Edit user | role · team assignment · phone · name |
| Deactivate | Sets `is_active = False` (soft delete — never hard delete) |

**Filter:** By role — All / Admin / PM / Lead / Volunteer

---

### 4.2 Upload Venue Map

| Element | Detail |
|---|---|
| Accepted formats | PNG, PDF, SVG |
| Storage | Saved to `/static/maps/` — path in `config` table, key `venue_map_path` |
| Behaviour | New upload overwrites previous — no version history for MVP |
| Preview | Current map filename and upload date shown below uploader |
| Usage | Map displayed in Volunteer sector view (optional background overlay) |

---

### 4.3 Batch Task Upload — Construction Plan

| Element | Detail |
|---|---|
| Accepted formats | CSV, XLSX |
| Max tasks | 500 per upload |
| Required columns | `zone · task_name · shift_start · shift_end · people_needed · skills · description · priority` |
| Validation | Parse with pandas → validate required columns → preview first 10 rows → user confirms |
| On confirm | Bulk insert into `tasks` with `status='open'`, `created_by=admin user_id` |
| Error handling | Show row-level validation errors before import. Do not partial-import on failure. |
| Post-import | Summary: X tasks imported · Y zones affected · Z shifts covered |

### Developer Notes
- Admin page must check `st.session_state["role"] == "admin"` at top. All other roles are redirected — this page exposes sensitive user data.
- Soft delete: never hard-delete users. Inactive users must be excluded from all dropdowns and feeds but retained in historical assignment records.
- Wrap the entire batch insert in a transaction — all rows succeed or none are committed.

---

## Database Schema Reference

```
users         user_id · name · email · role · phone · avatar_url · team_id · is_active · created_at
teams         team_id · name · zone · lead_id
tasks         task_id · zone · task_name · shift_start · shift_end · people_needed · slots_remaining · skills · priority · status · created_by
assignments   assignment_id · task_id · volunteer_id · team_id · status · created_at
requests      request_id · team_id · zone · people_needed · shift_start · shift_end · skills · notes · status · created_at
notifications notification_id · from_user_id · to_role · to_user_id · message · is_read · created_at
forecasts     forecast_id · zone · shift_slot · predicted_count · generated_at
config        key · value · updated_at
```

**Enum values:**

| Table.field | Values |
|---|---|
| `users.role` | `admin \| pm \| lead \| volunteer` |
| `tasks.status` | `open \| filled \| complete` |
| `tasks.priority` | `critical \| warning \| normal` |
| `assignments.status` | `assigned \| complete` |
| `requests.status` | `open \| partial \| filled` |
