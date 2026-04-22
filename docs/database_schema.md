# Database Schema — Supabase (PostgreSQL)

> Tables created in the Supabase dashboard (SQL editor). Python seed script inserts demo data via supabase-py.

---

## Tables

### profiles
Extends Supabase `auth.users` — never duplicate auth data.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK | References `auth.users.id` |
| `name` | TEXT | Full name |
| `email` | TEXT · UNIQUE | Login credential (mirrors auth.users) |
| `role` | TEXT | `admin` \| `pm` \| `lead` \| `volunteer` |
| `phone` | TEXT | For volunteer call-lead feature |
| `avatar_url` | TEXT | Profile picture path |
| `team_id` | UUID · FK → teams | NULL for admin and pm |
| `is_active` | BOOLEAN · DEFAULT true | Soft delete flag |
| `created_at` | TIMESTAMPTZ · DEFAULT now() | |

### teams

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK · DEFAULT gen_random_uuid() | |
| `name` | TEXT | Team display name |
| `zone` | TEXT | Physical zone assignment |
| `lead_id` | UUID · FK → profiles | Team lead reference |

### tasks

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK · DEFAULT gen_random_uuid() | |
| `zone` | TEXT | Physical zone |
| `task_name` | TEXT | |
| `shift_start` | TIMESTAMPTZ | |
| `shift_end` | TIMESTAMPTZ | |
| `people_needed` | INTEGER | Original headcount requirement |
| `slots_remaining` | INTEGER | Decremented on commit. **CHECK (slots_remaining >= 0)** |
| `skills` | TEXT | Free text |
| `priority` | TEXT | `critical` \| `warning` \| `normal` |
| `status` | TEXT · DEFAULT 'open' | `open` \| `filled` \| `complete` |
| `description` | TEXT | |
| `created_by` | UUID · FK → profiles | |
| `created_at` | TIMESTAMPTZ · DEFAULT now() | |

### assignments

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK · DEFAULT gen_random_uuid() | |
| `task_id` | UUID · FK → tasks | |
| `volunteer_id` | UUID · FK → profiles | |
| `team_id` | UUID · FK → teams | |
| `status` | TEXT · DEFAULT 'assigned' | `assigned` \| `complete` |
| `created_at` | TIMESTAMPTZ · DEFAULT now() | |

### requests

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK · DEFAULT gen_random_uuid() | |
| `team_id` | UUID · FK → teams | |
| `zone` | TEXT | |
| `people_needed` | INTEGER | |
| `shift_start` | TIMESTAMPTZ | |
| `shift_end` | TIMESTAMPTZ | |
| `skills` | TEXT | |
| `notes` | TEXT | |
| `status` | TEXT · DEFAULT 'open' | `open` \| `partial` \| `filled` |
| `created_at` | TIMESTAMPTZ · DEFAULT now() | |

### notifications

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK · DEFAULT gen_random_uuid() | |
| `from_user_id` | UUID · FK → profiles | |
| `to_role` | TEXT | Target role (e.g., 'lead') or NULL for specific user |
| `to_user_id` | UUID · FK → profiles | Specific recipient or NULL for role broadcast |
| `message` | TEXT | |
| `is_read` | BOOLEAN · DEFAULT false | |
| `created_at` | TIMESTAMPTZ · DEFAULT now() | |

### forecasts

| Column | Type | Notes |
|---|---|---|
| `id` | UUID · PK · DEFAULT gen_random_uuid() | |
| `zone` | TEXT | |
| `shift_slot` | TEXT | e.g., "09:00", "11:00" |
| `predicted_count` | INTEGER | ML model output |
| `generated_at` | TIMESTAMPTZ · DEFAULT now() | |

### config

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT · PK | e.g., "venue_map_path" |
| `value` | TEXT | |
| `updated_at` | TIMESTAMPTZ · DEFAULT now() | |

---

## Enum Values

| Table.column | Values |
|---|---|
| `profiles.role` | `admin` \| `pm` \| `lead` \| `volunteer` |
| `tasks.status` | `open` \| `filled` \| `complete` |
| `tasks.priority` | `critical` \| `warning` \| `normal` |
| `assignments.status` | `assigned` \| `complete` |
| `requests.status` | `open` \| `partial` \| `filled` |

---

## Constraints

- `tasks`: `CHECK (slots_remaining >= 0)` — prevents race conditions on volunteer commit
- `profiles`: `UNIQUE (email)`
- All foreign keys use `ON DELETE CASCADE` where safe, `ON DELETE SET NULL` for soft references

---

## Row Level Security

All tables have RLS enabled. Policies:

- **profiles:** authenticated users can read all active profiles. Users can update their own profile.
- **teams:** authenticated users can read all teams.
- **tasks:** authenticated users can read all tasks. PMs and admins can insert/update. Leads can update status for their zone's tasks.
- **assignments:** authenticated users can read. Volunteers can insert (commit to task). Leads can update status.
- **requests:** authenticated users can read. Leads can insert. PMs/admins can update status.
- **notifications:** users can read notifications targeted to their role or user_id. PMs/admins can insert.
- **forecasts:** authenticated users can read. Python service uses service_role key to write.
- **config:** authenticated users can read. Admins can update.

---

## Race Condition Handling

Volunteer task commit uses two guards:
1. Application-level: `.gt("slots_remaining", 0)` filter on update
2. Database-level: `CHECK (slots_remaining >= 0)` constraint

If the update returns 0 affected rows, the slot was taken — show "Taken" and refresh.

---

## Seed Data

`ml/seed_supabase.py` creates:
- 1 admin, 1 PM, 3 team leads, ~15 volunteers via `supabase.auth.sign_up()` + matching `profiles` rows
- 7 zones with teams
- Demo tasks across zones and shifts
- Idempotent via `.upsert()` on email
