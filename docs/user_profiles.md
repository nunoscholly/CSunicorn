# START CREW — User Profiles

> Four user roles: who they are, what they access, what they can do.

---

## Overview

| Role | View | Typical count | Key responsibility |
|---|---|---|---|
| Admin | All views | 1–2 | System setup, user management, file imports |
| Project Manager (pm) | PM Dashboard | 2–5 | Ops oversight, ML forecast, task coordination |
| Team Lead (lead) | Team Lead | 5–15 | Zone management, crew allocation, request people |
| Volunteer (volunteer) | Volunteer | 50–200+ | Accept tasks, find where to go, call lead |

Role is determined from the `profiles` table after auth. Stored in session/context and checked at route level (middleware + server components).

---

## Role 1 — Administrator

**When:** Before the event (setup) and during the week if issues arise.

### Permissions
- Create / edit / deactivate users (all roles)
- Upload venue map
- Batch import tasks via CSV
- Access all four views (read + write everywhere)
- Override any task assignment or request

### Dev Notes
- Admin bypasses all route guards — `role === "admin"` is always the first check
- Soft delete only: set `is_active = false`, never hard delete
- Batch CSV import: validate all columns before any DB writes, all-or-nothing

---

## Role 2 — Project Manager

**When:** Continuously during build week — primary screen for the event.

### Permissions
- Full access to PM Dashboard (all widgets)
- Read-only access to Team Lead view
- Add single tasks
- Push notifications to leads
- View all teams' data (no team_id scoping)
- Cannot manage users or batch import

### Dev Notes
- PM sees all teams, all zones — no team_id filtering on PM page
- ML forecast regenerated on page load, stored in `forecasts` table
- Progress bars computed live from task completion status

---

## Role 3 — Team Lead

**When:** On the ground during their shift.

### Permissions
- Full access to Team Lead view (own team only)
- Post manpower requests
- Mark tasks complete (own zone only)
- Read-only PM dashboard
- Cannot see other teams' rosters or requests

### OKRs (computed live, never stored)
| OKR | Formula |
|---|---|
| Stage completion % | completed tasks in zone / total tasks in zone × 100 |
| Crew utilisation % | assigned volunteers in zone / required headcount × 100 |
| Requests closed | filled requests / total requests by this lead |

### Dev Notes
- **Every query on this page must filter by team_id.** Apply at query level, never rely on UI.
- Task completion triggers PM dashboard update on next refresh.

---

## Role 4 — Volunteer

**When:** Throughout build week — checking for next task after finishing one.

### Permissions
- Full access to Volunteer view (own profile only)
- Commit to open jobs (one active task at a time)
- View venue sector map
- Call team lead via `tel:` link
- Cannot see other volunteers' profiles
- Cannot mark tasks complete or post requests

### Dev Notes
- **Race condition:** Two simultaneous commits can push `slots_remaining` negative. Guard with `.gt("slots_remaining", 0)` + `CHECK (slots_remaining >= 0)`.
- Lead phone number only exposed after volunteer commits to that lead's task.
- Sector map: color-coded grid, not interactive map. `< 50% = red, 50–89% = yellow, ≥ 90% = green`.

---

## Permission Matrix

| Feature | Admin | PM | Lead | Volunteer |
|---|---|---|---|---|
| ML forecast chart | R | R | R | — |
| Progress bars | R | R | R (own) | — |
| Outstanding requests | R | R | Own | — |
| Key metrics | R | R | Own | — |
| Venue sector map | R | R | R | R |
| Add single task | RW | RW | — | — |
| Batch import tasks | RW | — | — | — |
| Mark task complete | RW | — | Own zone | — |
| Commit to job | — | — | — | RW |
| Post manpower request | RW | — | RW | — |
| Send notifications | RW | RW | — | — |
| Manage users | RW | — | — | — |
| Upload venue map | RW | — | — | — |
| Call team lead | — | — | — | Action |

**Key:** R = read · RW = read/write · Own = scoped to own team_id · — = no access

---

## Route Protection

Implemented via Next.js middleware + server component checks.

| Route | Allowed Roles |
|---|---|
| `/project` | admin, pm |
| `/lead` | admin, lead |
| `/volunteer` | admin, volunteer |
| `/admin` | admin |

Unauthenticated users → redirect to login.
Wrong role → show error or redirect to their correct page.
