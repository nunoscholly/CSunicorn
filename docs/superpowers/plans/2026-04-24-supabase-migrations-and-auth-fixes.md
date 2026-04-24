# Supabase Migrations & Auth Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply four DB migrations (010–014), verify admin user-creation works for all roles, and update the seed script + forecast frontend to match the new forecasts schema.

**Architecture:** All changes are SQL migrations applied via Supabase Management API (no CLI). The forecasts schema change requires updating the seed script, TypeScript types, and the forecast chart component. User creation already works via the admin panel — we verify it and fix the demo admin role.

**Tech Stack:** PostgreSQL (Supabase), Next.js 14 (App Router), TypeScript, `@supabase/supabase-js`

**Branch:** `fix/supabase-migrations-and-auth` (branched from current `fix/auth-seed-via-admin-api`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/010_forecasts_schema_update.sql` | Drop old columns, add new ones |
| Create | `supabase/migrations/011_fix_demo_admin_role.sql` | Promote admin@startcrew.test to admin |
| Create | `supabase/migrations/012_notifications_sender_select.sql` | PM can read own sent notifications |
| Create | `supabase/migrations/013_cleanup_demo_text.sql` | Fix ASCII umlauts + [DEMO] bleed |
| Create | `supabase/migrations/014_cleanup_non_volunteer_assignments.sql` | Remove assignments for non-volunteers |
| Modify | `scripts/seed-demo.mjs` | Update forecast seed data to match new schema |
| Modify | `src/lib/supabase/types.ts` | Add `Forecast` type, update forecast fields |
| Modify | `src/app/(dashboard)/project/page.tsx:96-98,184-206` | Read new forecast columns |
| Modify | `src/app/(dashboard)/project/_components/forecast-chart.tsx:13-18` | Update `ForecastSlot` type |

---

### Task 1: Create branch and apply migration 010 — Forecasts schema update

The ML service needs `day`, `predicted_people`, `status`, and `tasks_active` instead of the old `zone`/`shift_slot`/`predicted_count` columns. The frontend forecast chart currently reads the old columns, so this migration must be coordinated with the frontend update (Task 6).

**Files:**
- Create: `supabase/migrations/010_forecasts_schema_update.sql`

- [ ] **Step 1: Create branch**

```bash
git checkout -b fix/supabase-migrations-and-auth
```

- [ ] **Step 2: Write the migration**

```sql
-- ============================================================
-- Migration 010 — Forecasts-Schema fuer ML-Service aktualisieren
--
-- Das ML-Skript prognostiziert pro Zone und Tag (nicht pro Timeslot).
-- Alte Spalten (shift_slot, predicted_count) werden durch die neuen
-- ersetzt: day, predicted_people, status, tasks_active.
-- ============================================================

BEGIN;

-- Alte Spalten entfernen
ALTER TABLE forecasts DROP COLUMN IF EXISTS shift_slot;
ALTER TABLE forecasts DROP COLUMN IF EXISTS predicted_count;

-- Neue Spalten hinzufuegen
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS day INTEGER;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS predicted_people INTEGER NOT NULL DEFAULT 0;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'outdated'));
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS tasks_active INTEGER NOT NULL DEFAULT 0;

-- Zone bleibt bestehen (wird weiterhin benoetigt)
-- generated_at bleibt bestehen

COMMIT;
```

- [ ] **Step 3: Apply via Supabase Management API**

```bash
# Read the SQL file and apply it via the Management API
node -e "
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/010_forecasts_schema_update.sql', 'utf-8');

fetch(process.env.SUPABASE_DB_URL || \`\${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc\`, {
  // Will be applied manually via SQL Editor
});
console.log('Migration 010 ready — paste into Supabase SQL Editor');
"
```

> **Note:** Since we don't have the Supabase CLI connected, paste each migration into the Supabase SQL Editor at https://supabase.com/dashboard. The migration files serve as version-controlled documentation.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_forecasts_schema_update.sql
git commit -m "Add migration 010: update forecasts schema for ML service"
```

---

### Task 2: Create migration 011 — Fix demo admin role

The demo admin user `admin@startcrew.test` may have role `volunteer` in the profiles table if the `handle_new_user` trigger defaulted. This migration ensures it's set to `admin`.

**Files:**
- Create: `supabase/migrations/011_fix_demo_admin_role.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Migration 011 — Demo-Admin-Rolle korrigieren (BUG-1 / BUG-S3)
--
-- Falls der handle_new_user-Trigger die Rolle aus user_metadata nicht
-- korrekt uebernommen hat, wird admin@startcrew.test hier explizit
-- auf role='admin' gesetzt.
-- ============================================================

UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@startcrew.test'
  AND role <> 'admin';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/011_fix_demo_admin_role.sql
git commit -m "Add migration 011: fix demo admin role (BUG-1/BUG-S3)"
```

---

### Task 3: Create migration 012 — Notifications sender SELECT policy

PMs currently can't read back their own sent notifications because the `notifications_select` RLS policy only matches `to_user_id` or `to_role`. The PM Dashboard's "Sent Log" section needs `from_user_id = auth.uid()` too.

**Files:**
- Create: `supabase/migrations/012_notifications_sender_select.sql`

- [ ] **Step 3: Write the migration**

```sql
-- ============================================================
-- Migration 012 — Notifications: Absender darf eigene Nachrichten lesen
-- (BUG-3 / BUG-S2)
--
-- Die bestehende SELECT-Policy liess nur Empfaenger lesen. PMs konnten
-- ihre eigenen gesendeten Broadcasts im Sent-Log nicht sehen.
-- ============================================================

DROP POLICY IF EXISTS "notifications_select" ON notifications;

CREATE POLICY "notifications_select"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        to_user_id = auth.uid()
        OR to_role = (SELECT role FROM profiles WHERE id = auth.uid())
        OR from_user_id = auth.uid()
    );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/012_notifications_sender_select.sql
git commit -m "Add migration 012: let senders read own notifications (BUG-3/BUG-S2)"
```

---

### Task 4: Create migration 013 — Cleanup demo text

ASCII umlauts (e.g., "ue" instead of "ü") and `[DEMO]` tags bleed into the UI. This migration fixes visible demo text.

**Files:**
- Create: `supabase/migrations/013_cleanup_demo_text.sql`

- [ ] **Step 4: Write the migration**

```sql
-- ============================================================
-- Migration 013 — Demo-Text bereinigen (BUG-5 / BUG-6)
--
-- 1. ASCII-Umlaute in task_name/description durch echte Umlaute ersetzen
-- 2. [DEMO]-Tag aus sichtbaren Feldern entfernen (nur in task_name,
--    da notes/message den Tag als Cleanup-Marker brauchen)
-- ============================================================

BEGIN;

-- ASCII-Umlaute in Tasks korrigieren
UPDATE tasks SET task_name = REPLACE(task_name, 'Buehne', 'Bühne') WHERE task_name LIKE '%Buehne%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Kueche', 'Küche') WHERE task_name LIKE '%Kueche%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Notausgaenge', 'Notausgänge') WHERE task_name LIKE '%Notausgaenge%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Stuehle', 'Stühle') WHERE task_name LIKE '%Stuehle%';

-- [DEMO]-Suffix aus Task-Namen entfernen (fuer saubere UI)
UPDATE tasks SET task_name = TRIM(REPLACE(task_name, '[DEMO]', '')) WHERE task_name LIKE '%[DEMO]%';

COMMIT;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/013_cleanup_demo_text.sql
git commit -m "Add migration 013: fix ASCII umlauts and [DEMO] bleed (BUG-5/BUG-6)"
```

---

### Task 5: Create migration 014 — Cleanup non-volunteer assignments

If any assignments exist for non-volunteer users (leads, PMs), they should be removed — only volunteers should have assignments.

**Files:**
- Create: `supabase/migrations/014_cleanup_non_volunteer_assignments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Migration 014 — Assignments fuer Nicht-Volunteers entfernen (BUG-4)
--
-- Nur Volunteers duerfen Assignments haben. Falls durch Seed oder
-- manuelle Eintraege Leads/PMs zugewiesen wurden, bereinigen.
-- ============================================================

DELETE FROM assignments
WHERE volunteer_id IN (
    SELECT id FROM profiles WHERE role NOT IN ('volunteer')
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/014_cleanup_non_volunteer_assignments.sql
git commit -m "Add migration 014: remove non-volunteer assignments (BUG-4)"
```

---

### Task 6: Update seed script forecasts to match new schema

The seed script currently inserts `zone`, `shift_slot`, `predicted_count`. After migration 010, the table has `zone`, `day`, `predicted_people`, `status`, `tasks_active` instead.

**Files:**
- Modify: `scripts/seed-demo.mjs` (DEMO_FORECASTS section and insert logic)

- [ ] **Step 1: Update forecast data structure in seed script**

Replace the forecast constants and generation logic. The new schema stores predictions per zone per day (day 1–9 of build week), not per time slot.

```javascript
// Replace ZONES, SLOTS, FORECAST_VALUES, and DEMO_FORECASTS generation with:

const FORECAST_ZONES = [
  "Stage A", "Stage B", "Catering", "Entrance",
  "Backstage", "AV/Tech", "Main Hall",
];

// Vorhergesagte Werte pro Zone fuer Tag 1–9 der Build-Week
const FORECAST_BY_DAY = {
  "Stage A":  [3, 4, 5, 5, 4, 4, 5, 4, 2],
  "Stage B":  [4, 5, 5, 5, 4, 4, 3, 3, 2],
  Catering:   [4, 5, 6, 6, 6, 5, 4, 4, 2],
  Entrance:   [3, 4, 3, 3, 3, 3, 3, 2, 1],
  Backstage:  [2, 3, 3, 3, 3, 3, 3, 2, 1],
  "AV/Tech":  [3, 4, 4, 4, 3, 3, 3, 3, 2],
  "Main Hall":[5, 8, 7, 7, 6, 5, 5, 4, 2],
};

const DEMO_FORECASTS = [];
for (const zone of FORECAST_ZONES) {
  const values = FORECAST_BY_DAY[zone];
  for (let day = 1; day <= 9; day++) {
    DEMO_FORECASTS.push({
      zone,
      day,
      predicted_people: values[day - 1],
      status: day <= 4 ? "confirmed" : "pending",
      tasks_active: Math.max(1, Math.floor(values[day - 1] / 2)),
    });
  }
}
```

- [ ] **Step 2: Run seed script to verify it works**

```bash
npm run seed:demo
```

Expected: `✓ 63 Forecasts angelegt.` (7 zones × 9 days)

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-demo.mjs
git commit -m "Update seed forecasts to match new schema (day/predicted_people/status)"
```

---

### Task 7: Update TypeScript types and forecast chart

The frontend reads the old `shift_slot`/`predicted_count` columns. After migration 010, it needs to read `day`/`predicted_people`/`status`/`tasks_active`.

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/app/(dashboard)/project/page.tsx:96-98,184-206`
- Modify: `src/app/(dashboard)/project/_components/forecast-chart.tsx:13-18`

- [ ] **Step 1: Add Forecast type to types.ts**

Add after the `ConfigRow` type:

```typescript
export type Forecast = {
    id: string;
    zone: string;
    day: number | null;
    predicted_people: number;
    status: "pending" | "confirmed" | "outdated";
    tasks_active: number;
    generated_at: string;
};
```

- [ ] **Step 2: Update forecast query in project/page.tsx**

Change the forecasts select (around line 96) from:
```typescript
.select("zone, shift_slot, predicted_count, generated_at")
```
to:
```typescript
.select("zone, day, predicted_people, status, tasks_active, generated_at")
```

- [ ] **Step 3: Update forecast slot computation in project/page.tsx**

The current logic (lines ~184–206) aggregates by `shift_slot` label. With the new schema, forecasts are per day, not per time slot. The forecast chart now shows per-day data. Update the `forecastSlots` computation:

```typescript
// --- Forecast-Chart (§1.2) — jetzt tagesbasiert statt Slot-basiert ---
const forecastSlots: ForecastSlot[] = [];
const days = Array.from(new Set(forecasts.map((f) => f.day))).sort((a, b) => (a ?? 0) - (b ?? 0));

for (const day of days) {
    if (day == null) continue;
    const dayForecasts = forecasts.filter((f) => f.day === day);
    const predicted = dayForecasts.reduce((sum, f) => sum + (f.predicted_people ?? 0), 0);
    // Actual: count assignments for tasks on this day
    let actual = 0;
    for (const t of tasks) {
        if (t.day === day || (t.shift_start && new Date(t.shift_start).getDay() === day)) {
            actual += assignmentByTask.get(t.id) ?? 0;
        }
    }
    forecastSlots.push({
        label: `Tag ${day}`,
        actual,
        predicted,
        isFuture: day > 4, // first 4 days are "past" in demo
    });
}
```

- [ ] **Step 4: Verify the dev server starts without errors**

```bash
npm run dev
```

Open http://localhost:3000, login as `pm.aier@startcrew.test` / `StartCrew123!`, check the forecast chart renders.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/types.ts src/app/\(dashboard\)/project/page.tsx src/app/\(dashboard\)/project/_components/forecast-chart.tsx
git commit -m "Update forecast chart and types to match new day-based schema"
```

---

### Task 8: Verify admin user creation works for all roles

The admin panel already has a working "User anlegen" form (in `src/app/(dashboard)/admin/_components/user-management.tsx`) that calls `createUserAction` which uses `supabase.auth.admin.createUser()`. Verify it works by testing via the UI.

**Files:** None (manual verification)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login as admin**

Go to http://localhost:3000, login as `admin@startcrew.test` / `StartCrew123!`

- [ ] **Step 3: Create test users for each role**

Use the "User anlegen" button on the Admin page to create:
1. A test PM: `testpm@startcrew.test` / `TestPM123!` / role: PM
2. A test Lead: `testlead@startcrew.test` / `TestLead123!` / role: Lead
3. A test Volunteer: `testvol@startcrew.test` / `TestVol123!` / role: Volunteer

- [ ] **Step 4: Verify each can login**

Log out and log in with each test user. Verify they land on the correct dashboard:
- PM → `/project`
- Lead → `/lead`
- Volunteer → `/volunteer`

- [ ] **Step 5: Clean up test users**

Deactivate the test users from the admin panel (soft delete).

---

### Task 9: Push branch and create PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin fix/supabase-migrations-and-auth
```

- [ ] **Step 2: Create a PR**

```bash
gh pr create --base main --title "Add Supabase migrations 010-014 and update forecast schema" --body "$(cat <<'EOF'
## Summary
- Migration 010: Update forecasts schema (day/predicted_people/status/tasks_active)
- Migration 011: Fix demo admin role (BUG-1/BUG-S3)
- Migration 012: Let notification senders read own messages (BUG-3/BUG-S2)
- Migration 013: Fix ASCII umlauts and [DEMO] tag bleed (BUG-5/BUG-6)
- Migration 014: Remove non-volunteer assignments (BUG-4)
- Updated seed script and forecast chart to match new schema
- Verified admin can create users for all four roles

## Applying migrations
Paste each migration file (010–014) into the Supabase SQL Editor in order.
Then run `npm run seed:demo` to re-seed with the correct forecast format.

## Test plan
- [ ] All migrations apply without errors in SQL Editor
- [ ] `npm run seed:demo` completes successfully
- [ ] PM dashboard forecast chart renders with day-based data
- [ ] Admin can create users for all roles (admin, pm, lead, volunteer)
- [ ] Each role can log in and reach the correct dashboard

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Execution Notes

- **Migration order matters:** Apply 010 before running the seed script, or forecasts insert will fail.
- **No Supabase CLI needed:** All migrations are designed to be pasted into the SQL Editor manually.
- **The admin user-creation flow already works** — `createUserAction` in `admin/actions.ts` uses `admin.auth.admin.createUser()` with `email_confirm: true` and passes `role` in `user_metadata`. The `handle_new_user` trigger picks it up. Task 8 is verification only.
- **The [DEMO] cleanup (013) removes the tag from task_name only.** The `notes`/`message` fields keep the tag because the seed script uses it for idempotent cleanup (`DELETE ... LIKE '[DEMO]%'`).
