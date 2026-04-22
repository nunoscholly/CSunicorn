# START CREW — User Profiles

> Defines the four user roles in START CREW: who they are, what they can access,  
> what they can do, and what developers need to know to build their flows correctly.

---

## Overview

START CREW has four distinct user roles. Each role maps to a specific view and a specific set of permissions. Role is stored in `st.session_state["role"]` after login and checked at the top of every page before rendering any content.

| Role | View | Typical count | Key responsibility |
|---|---|---|---|
| Admin | All views | 1–2 | System setup, user management, file imports |
| Project Manager (pm) | Project Mgmt | 2–5 | Ops oversight, ML forecast, task coordination |
| Team Lead (lead) | Team Lead | 5–15 | Zone management, crew allocation, request people |
| Volunteer (volunteer) | Volunteer | 50–200+ | Accept tasks, find out where to go, call lead |

---

## Users Table Schema

All four roles share the same `users` table. Role determines which view they see and what they can do.

| Field | Type | Notes |
|---|---|---|
| `user_id` | UUID · PK | Auto-generated |
| `name` | STRING | Full name |
| `email` | STRING · UNIQUE | Login credential |
| `role` | ENUM | `admin \| pm \| lead \| volunteer` |
| `phone` | STRING | Used for volunteer call-lead feature |
| `avatar_url` | STRING | Path to profile picture file |
| `team_id` | FK → teams | `NULL` for admin and pm |
| `is_active` | BOOLEAN | Soft delete — never hard delete |
| `created_at` | TIMESTAMP | Auto |

---

## Role 1 — Administrator

### Description
The system owner — typically the Start Summit tech lead or operations director. They configure the app before the build week begins and can intervene in any part of the system at any time. They do not use the day-to-day task or volunteer flows.

**When they work:** Primarily before the event (setup) and occasionally during the week if issues arise.

**What makes this role different:** Full system access with no data scoping. The only role that can manage users, upload files, and batch-import tasks.

---

### Permissions

| Permission | Access |
|---|---|
| Create / edit / deactivate users | Full — all roles |
| Upload and replace venue map | Full |
| Batch import construction plan via CSV | Full |
| Access all four views | Full — read + write everywhere |
| Override any task assignment or request | Full |
| View system audit log | Full |
| Post manpower requests | Full |
| Manage notifications | Full |

---

### Functionality

| Type | Feature |
|---|---|
| Admin | Create, edit, deactivate user accounts — assign roles, team, phone |
| Write | Upload venue map (PNG, PDF, SVG) — displayed in volunteer sector view |
| Write | Batch import tasks via CSV — validates columns, previews, bulk inserts |
| Admin | Override any task assignment or request in the system |
| Read | Access full audit log of user actions and task changes |
| Read | View all four views without restriction |

---

### Developer Notes

**Authentication:**  
Role stored in `st.session_state["role"]` after login. Admin bypasses all route guards. Use `role == "admin"` check at the top of each page as the first condition.

**File upload:**  
Venue map stored as a file path in a `config` table — single row, keyed `venue_map_path`. Overwrite on new upload. CSV parsed with `pandas`; validate all required columns before any DB writes.

**Soft delete:**  
Never hard-delete users. Set `is_active = False`. Filter inactive users out of all volunteer/lead dropdowns and feeds, but retain in historical records for audit integrity.

**Batch import:**  
Wrap the entire CSV insert in a transaction — all rows succeed or none are committed. Show row-level validation errors before asking the admin to confirm. Do not partial-import.

---

## Role 2 — Project Manager

### Description
The person running the construction week operationally. They monitor the ML forecast, track progress across all zones, triage outstanding requests from team leads, and push updates to the crew. They can add individual tasks as the plan evolves during the week.

**When they work:** Continuously during the build week — this is their primary screen for the entire event.

**What makes this role different:** The primary consumer of the ML forecast and data visualisations. Has read access across all teams (no `team_id` scoping) but cannot manage users or batch-import files.

---

### Permissions

| Permission | Access |
|---|---|
| Full access to Project Mgmt view | Full — all widgets |
| Read Team Lead view | Read-only — monitor, no edit |
| Add single tasks | Full |
| Batch import tasks | No — admin only |
| Push notification updates to leads | Full |
| Manage users | No — admin only |
| Accept volunteer tasks | No — volunteer role only |
| View all teams' requests and data | Full — no team_id scoping |

---

### Functionality

| Type | Feature |
|---|---|
| Read | View ML workforce forecast chart — predicted vs actual staffing per shift, full day |
| Read | Monitor progress bars per zone — % completion from task completion status |
| Read | View outstanding requests sorted by priority (Critical → Warning → Filled) |
| Read | View key metric stat cards — active crew, open requests, completion %, coverage % |
| Write | Add single task — zone, shift, people needed, skills, description, priority |
| Action | Push notification to specific lead or all leads simultaneously |
| Read | Sent notifications log — timestamped, with recipient label |

---

### Developer Notes

**ML forecast:**  
Model input: historical shift data + current assignments. Output: predicted headcount per 2h slot. Store predictions in `forecasts` table with `shift_id, predicted_count, generated_at`. Regenerate on each page load. Use `scikit-learn` — `RandomForestRegressor` or `LinearRegression` are appropriate.

**Progress computation:**  
Zone progress = `completed_tasks / total_tasks * 100` grouped by `zone_id`. Tasks marked complete only by team leads. Do not allow volunteers to mark tasks complete.

**Notifications:**  
Store in `notifications` table: `id, from_user_id, to_role, message, created_at, is_read`. Team lead view polls this table on page refresh and surfaces unread items. No push technology needed — Streamlit's page refresh model handles it.

**No team_id scoping:**  
Unlike the team lead, the PM sees all requests, all teams, all zones. Do not apply team_id filtering on the project management page.

---

## Role 3 — Team Lead

### Description
Zone owners who manage a specific area (Stage B, Catering, AV, etc.) for a given shift. They know what needs doing and who they have, but have no visibility into the wider volunteer pool. START CREW gives them a direct line to post manpower requests, see their assigned crew, track tasks and OKRs, and receive real-time updates from project management.

**When they work:** On the ground during their shift — checking in at the start, posting requests when short-staffed, marking tasks complete as work progresses.

**What makes this role different:** All data is strictly scoped to their `team_id`. They can see progress metrics but only for their own zone. The only role that can mark tasks complete and post manpower requests.

---

### Permissions

| Permission | Access |
|---|---|
| Full access to Team Lead view | Full — their team only |
| Post manpower requests | Full |
| Mark tasks complete | Their zone tasks only |
| Read Project Mgmt dashboard | Read-only — no edit |
| Edit other teams' data | No — strictly scoped to own `team_id` |
| Manage users or upload files | No — admin only |
| Accept volunteer tasks | No — volunteer role only |
| View other teams' rosters or requests | No |

---

### Functionality

| Type | Feature |
|---|---|
| Read | Updates feed from PM — unread items highlighted, timestamped, colour-coded by urgency |
| Read | Full team roster for their zone — who is assigned per shift, name, role, avatar |
| Read | Team coverage bar — staffed % against required headcount |
| Read | Daily task checklist — task name, zone, scheduled time, checkbox |
| Action | Mark tasks complete — updates `tasks.status = 'complete'`, triggers PM progress update |
| Read | OKR panel — stage completion %, crew utilisation %, requests closed ratio |
| Write | Post manpower request — zone, people_needed, shift, skills, notes |
| Read | View own submitted requests with current status badges |

---

### OKR Definitions

| OKR | Computation |
|---|---|
| Stage completion % | `COUNT(tasks WHERE status='complete' AND zone=lead_zone) / COUNT(all tasks in zone) × 100` |
| Crew utilisation % | `COUNT(assigned volunteers in zone) / required_headcount_for_zone × 100` |
| Requests closed | `COUNT(requests WHERE status='filled' AND team_id=lead_team) / COUNT(all requests by lead)` |

**Important:** OKR values are always computed on the fly — never stored. Recalculate on every page load.

---

### Developer Notes

**Data scoping — critical:**  
Every single SQL query on the team lead page must filter by `team_id = st.session_state["team_id"]`. Apply this at the query level — never rely on the UI to hide it. A team lead must never see another team's tasks, requests, or roster data.

**Requests table:**  
Schema: `request_id, team_id, zone, people_needed, shift_start, shift_end, skills, notes, status, created_at`  
Status enum: `open | partial | filled`  
PM dashboard reads all requests; lead only sees rows where `team_id` matches theirs.

**Task completion:**  
When a lead marks a task complete, the PM dashboard progress bar for that zone should update on next refresh. No real-time push needed — Streamlit page refresh handles it.

---

## Role 4 — Volunteer

### Description
The largest user group — the people physically doing the build work. They may be idle between tasks, unsure where to go next, or unaware that another team desperately needs help nearby. START CREW gives them a personal task feed, a colour-coded sector map showing where help is needed, and direct contact to team leads.

**When they work:** Throughout the build week — checking the app when they finish a task to find the next one, or when they arrive on site and don't know where to go.

**What makes this role different:** The most restricted role. Read-only access to most data, with the ability to commit to one task at a time. Their profile picture and phone number are visible to leads for on-the-ground identification.

---

### Permissions

| Permission | Access |
|---|---|
| Full access to Volunteer view | Full — own profile and tasks only |
| Commit to open jobs | One active task at a time |
| View venue sector map | Read-only |
| Call team lead | Via `tel:` link on job card |
| View other volunteers' profiles | No — own profile only |
| Post manpower requests | No — lead only |
| Mark tasks complete | No — lead only |
| Access Project Mgmt, Team Lead, or Admin views | No — route-guarded |

---

### Functionality

| Type | Feature |
|---|---|
| Read | Personal profile — name, photo, status (Available / Assigned), active task |
| Read | Venue sector map — colour-coded zones (Red < 50% / Yellow 50–89% / Green ≥ 90%) |
| Read | Browse open job cards — zone, shift, description, slots available, point of contact |
| Action | Commit to a job — sets status to `assigned`, decrements `slots_remaining`, notifies lead |
| Action | Call team lead — `tel:` link using lead's phone from DB |
| Read | Active task details — location, shift time, lead contact, description |

---

### Developer Notes

**Task commitment logic:**  
On commit:
1. Insert into `assignments`: `volunteer_id, task_id, team_id, status='assigned'`
2. Decrement `tasks.slots_remaining`
3. If `slots_remaining == 0` → set `tasks.status = 'filled'`
4. Enforce one active task per volunteer: check for existing `assignments` row with `status='assigned'` before allowing commit

**Race condition — critical:**  
Two volunteers hitting commit simultaneously can push `slots_remaining` negative. Handle with either:
- A database transaction with `SELECT FOR UPDATE` / optimistic locking
- A `CHECK (slots_remaining >= 0)` constraint on the `tasks` table

**Profile picture:**  
Store as `avatar_url` in the `users` table. In Streamlit use `st.image(avatar_url, width=80)`. For MVP, use initials fallback if no image uploaded. Image upload via `st.file_uploader` — save to `/static/avatars/{user_id}.png`.

**Call feature:**  
```python
st.markdown(f'<a href="tel:{lead_phone}">Call {lead_name}</a>', unsafe_allow_html=True)
```
No backend needed — the browser handles the call intent. Only expose lead phone numbers to volunteers who have committed to that lead's task. Do not show lead phone on the browse/pre-commit job card.

**Sector map:**  
Not an interactive map — render as a styled grid of `st.columns` or HTML tiles. Colour driven by `staffed_count / required_count` ratio per zone, computed from live `assignments` data joined with `tasks`. Thresholds: `< 0.5 = red`, `0.5–0.89 = yellow`, `>= 0.90 = green`.

---

## Permission Matrix — All Roles

| Feature | Admin | PM | Lead | Volunteer |
|---|---|---|---|---|
| **Data & visualisation** | | | | |
| ML forecast chart | R | R | R | — |
| Progress tracking bars | R | R | R | — |
| Outstanding requests view | R | R | Own only | — |
| Key metrics dashboard | R | R | Own only | — |
| Venue sector map | R | R | R | R |
| **Task management** | | | | |
| Add single task | RW | RW | — | — |
| Batch import tasks (CSV) | RW | — | — | — |
| Mark task complete | RW | — | Own zone | — |
| Commit to open job | — | — | — | RW |
| **Requests & people** | | | | |
| Post manpower request | RW | — | RW | — |
| View all requests | R | R | Own only | — |
| Send update notification | RW | RW | — | — |
| View team roster | R | R | Own only | — |
| Call team lead | — | — | — | Action |
| **System & admin** | | | | |
| Manage users | RW | — | — | — |
| Upload venue map | RW | — | — | — |
| Batch import construction plan | RW | — | — | — |
| View audit log | R | — | — | — |

**Key:** R = read · RW = read/write · Own = scoped to own team_id · — = no access

---

## Route Guard Implementation

Every page in the app must begin with this pattern:

```python
import streamlit as st

# Route guard — must be the first executable code on every page
if "role" not in st.session_state:
    st.switch_page("pages/login.py")
    st.stop()

allowed_roles = ["admin", "pm"]  # adjust per page
if st.session_state["role"] not in allowed_roles:
    st.error("You don't have access to this page.")
    st.stop()

# Page content begins here
```

| Page | Allowed roles |
|---|---|
| `/project` | `admin`, `pm` |
| `/lead` | `admin`, `lead` |
| `/volunteer` | `admin`, `volunteer` |
| `/admin` | `admin` only |
