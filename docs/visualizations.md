# START CREW — Page Specs & Visualizations

> Page-by-page UI specs, content, features, and data sources.

---

## Application Structure

```
/               Login
/project        Project Management  (PM, Admin)
/lead           Team Lead           (Lead, Admin)
/volunteer      Volunteer           (Volunteer, Admin)
/admin          Admin               (Admin only)
```

Navigation is role-gated. Persistent nav bar + logout on all authenticated views.

---

## Global Components

### Nav Bar
- START CREW double-wedge logo, left-aligned
- Role-gated nav links
- Active page highlighted in Signal Yellow (#F5C800)
- Logout button right-aligned

### Status Badges
| Badge | Color | Used for |
|---|---|---|
| Critical / Urgent | Red | Understaffed, < 50% coverage |
| Warning | Yellow | 50–89% coverage |
| Staffed / OK | Green | Fully staffed |
| Available | Yellow pill | Volunteer idle |
| Assigned | Green pill | Volunteer committed |
| Taken | Grey | Slot full |

---

## Page 0 — Login

**Route:** `/`

| Type | Feature |
|---|---|
| Display | START CREW wordmark centered above form |
| Input | Email + password fields |
| Action | Login button → Supabase Auth sign-in |
| Logic | Check `is_active` in profiles. Route by role after auth. |
| Error | Inline error, keep email field on failure |

---

## Page 1 — Project Management Dashboard

**Route:** `/project` · **Roles:** PM, Admin
**Grading:** #3 (viz), #5 (ML), #4 (interaction), #2 (API/DB)

### 1.1 Key Metrics — Stat Cards (4 across top)
| Metric | Source |
|---|---|
| Active volunteers | profiles where is_active + has assignment |
| Open requests | requests where status in ('open', 'partial') |
| Tasks complete % | completed / total tasks |
| Coverage today % | staffed slots / required slots |

### 1.2 ML Tagesprognose — Personalbedarf
- **Type:** Bar chart (one bar per day, days 1–9)
- **X-axis:** Build-Week-Tage (Tag 1–9) mit Phasen-Label (Setup / Showday / Teardown)
- **Y-axis:** Vorhergesagter Personalbedarf
- **Farbe:** Grün = im Plan, Gelb = kritisch, Rot = verzögert (Ampel-Logik)
- **Tooltip:** Aktive Aufgaben pro Tag
- **Leerstatus:** Hinweis "ml/forecast.py ausführen" wenn keine Daten vorhanden
- **Data:** `forecasts` table (`day`, `predicted_people`, `status`, `tasks_active`), written by `ml/forecast.py`

### 1.3 Progress Bars (per zone)
- Zones: Stage A · Stage B · Catering · Entrance · Backstage · AV/Tech · Main Hall
- Green ≥ 80% · Yellow 50–79% · Red < 50%
- Computed live from tasks table

### 1.4 Outstanding Requests
- Sorted: Critical → Warning → Filled
- Each row: zone, people needed, shift, status badge
- PM can resolve/close requests

### 1.5 Add Task Form
- Fields: zone, task name, shift start/end, people needed, skills, priority, description
- Inserts into tasks with status='open'

### 1.6 Notification Composer
- Recipient: all leads or specific lead
- Message textarea
- Inserts into notifications table
- Sent log below

---

## Page 2 — Team Lead

**Route:** `/lead` · **Roles:** Lead, Admin
**Grading:** #4, #3, #2

### 2.1 Updates Feed
- Notifications from PM, chronological
- Color dot by urgency, unread = bold
- Click marks as read

### 2.2 Team Roster (shift view)
- Member cards: avatar, name, role
- Empty slots: dashed placeholder
- Coverage bar: staffed / required

### 2.3 Task Checklist + OKR
- Checkbox per task → marks complete
- OKR panel (computed live): stage completion %, crew utilisation %, requests closed

### 2.4 Request People Form
- Fields: zone (pre-filled), people needed, shift, skills, notes
- Inserts into requests
- Own requests with status below

---

## Page 3 — Volunteer

**Route:** `/volunteer` · **Roles:** Volunteer, Admin
**Grading:** #4, #3, #2

### 3.1 Profile Strip
- Avatar, name, status badge (Available/Assigned), active task name

### 3.2 Venue Sector Map
- Color-coded tile grid (not interactive map)
- Each tile: zone name, staffed/required count
- Colors: < 50% red · 50–89% yellow · ≥ 90% green

### 3.3 Open Jobs Feed
- Cards sorted by urgency
- Each card: job name, zone, shift, description, slots remaining, urgency badge, lead contact
- **Commit button** (yellow) — assigns volunteer
- **Call button** (green, `tel:` link) — only after commit
- Taken jobs: greyed out, disabled "Taken" button

### Commit Logic
1. Update tasks.slots_remaining with `.gt("slots_remaining", 0)` guard
2. Insert into assignments
3. If slots_remaining == 0 → status = 'filled'
4. One active task per volunteer enforced

---

## Page 4 — Admin

**Route:** `/admin` · **Roles:** Admin only
**Grading:** #4, #2

### 4.1 User Management
- Table: avatar, name, email, role badge, active status
- Role badges: Admin=green, PM=yellow, Lead=purple, Volunteer=blue
- Actions: add, edit, deactivate (soft delete)

### 4.2 Upload Venue Map
- Formats: PNG, PDF, SVG
- Saved to `public/maps/`, path in config table
- New upload overwrites previous

### 4.3 Batch Task Upload
- Formats: CSV, XLSX
- Required columns: zone, task_name, shift_start, shift_end, people_needed, skills, description, priority
- Parse → validate → preview first 10 rows → confirm → bulk insert
- All-or-nothing: no partial imports
