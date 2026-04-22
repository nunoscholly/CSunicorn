-- ============================================================
-- START CREW — Auth & Profiles Migration
-- Rebuilds schema to match docs/database_schema.md:
--   - Renames users → profiles (UUID PK = auth.users.id)
--   - All tables use UUID PKs
--   - Adds trigger: auto-create profile on Supabase Auth signup
--   - Role-based RLS policies
-- ============================================================

-- ============================================================
-- 1. DROP OLD TABLES (will be recreated below)
-- ============================================================
DROP TABLE IF EXISTS historical_staffing CASCADE;
DROP TABLE IF EXISTS forecasts CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- 2. TEAMS
-- ============================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    zone TEXT NOT NULL,
    lead_id UUID          -- FK added after profiles exists
);

-- ============================================================
-- 3. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'volunteer'
        CHECK (role IN ('admin', 'pm', 'lead', 'volunteer')),
    phone TEXT,
    avatar_url TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now wire up teams.lead_id → profiles
ALTER TABLE teams
    ADD CONSTRAINT fk_teams_lead
    FOREIGN KEY (lead_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 4. TASKS
-- ============================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone TEXT,
    task_name TEXT NOT NULL,
    day INTEGER,
    shift_start TIMESTAMPTZ,
    shift_end TIMESTAMPTZ,
    duration_hours REAL,
    people_needed INTEGER NOT NULL DEFAULT 1,
    slots_remaining INTEGER NOT NULL DEFAULT 1,
    skills TEXT,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('critical', 'warning', 'normal')),
    description TEXT,
    depends_on TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'filled', 'complete')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT slots_not_negative CHECK (slots_remaining >= 0)
);

-- ============================================================
-- 5. ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'complete')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. REQUESTS
-- ============================================================
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    zone TEXT,
    people_needed INTEGER NOT NULL DEFAULT 1,
    shift_start TIMESTAMPTZ,
    shift_end TIMESTAMPTZ,
    skills TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'partial', 'filled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    to_role TEXT,
    to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. FORECASTS
-- ============================================================
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone TEXT NOT NULL,
    shift_slot TEXT NOT NULL,
    predicted_count INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. CONFIG
-- ============================================================
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. HISTORICAL STAFFING (ML training data)
-- ============================================================
CREATE TABLE historical_staffing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name TEXT NOT NULL,
    depends_on TEXT,
    day INTEGER NOT NULL,
    year INTEGER NOT NULL,
    people INTEGER,
    duration_hours REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. AUTO-CREATE PROFILE ON SIGNUP (trigger)
--
-- When a user signs up via Supabase Auth, this trigger
-- automatically creates a row in profiles. The frontend
-- can pass name and role via user_metadata on signup:
--
--   supabase.auth.signUp({
--     email: "...",
--     password: "...",
--     options: { data: { name: "Max", role: "volunteer" } }
--   })
--
-- If no metadata is passed, defaults to empty name + volunteer.
-- Admins can update the role afterwards.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'volunteer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_staffing ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
-- Everyone can read active profiles
CREATE POLICY "profiles_select"
    ON profiles FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Admins can update any profile (role changes, deactivation)
CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert profiles (for manual user creation)
CREATE POLICY "profiles_insert_admin"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ---- TEAMS ----
CREATE POLICY "teams_select"
    ON teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "teams_insert_admin"
    ON teams FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "teams_update_admin"
    ON teams FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ---- TASKS ----
CREATE POLICY "tasks_select"
    ON tasks FOR SELECT
    TO authenticated
    USING (true);

-- PMs and admins can create tasks
CREATE POLICY "tasks_insert"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- PMs, admins, and leads (own zone) can update tasks
CREATE POLICY "tasks_update"
    ON tasks FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN teams t ON t.lead_id = p.id
            WHERE p.id = auth.uid() AND p.role = 'lead' AND t.zone = tasks.zone
        )
    );

-- ---- ASSIGNMENTS ----
CREATE POLICY "assignments_select"
    ON assignments FOR SELECT
    TO authenticated
    USING (true);

-- Volunteers can commit to tasks (insert assignment)
CREATE POLICY "assignments_insert_volunteer"
    ON assignments FOR INSERT
    TO authenticated
    WITH CHECK (volunteer_id = auth.uid());

-- Leads and admins can update assignment status
CREATE POLICY "assignments_update"
    ON assignments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'lead')
        )
    );

-- ---- REQUESTS ----
CREATE POLICY "requests_select"
    ON requests FOR SELECT
    TO authenticated
    USING (true);

-- Leads can create requests
CREATE POLICY "requests_insert"
    ON requests FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'lead')
        )
    );

-- PMs and admins can update request status
CREATE POLICY "requests_update"
    ON requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- ---- NOTIFICATIONS ----
-- Users see notifications for their role or directed at them
CREATE POLICY "notifications_select"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        to_user_id = auth.uid()
        OR to_role = (SELECT role FROM profiles WHERE id = auth.uid())
    );

-- PMs and admins can send notifications
CREATE POLICY "notifications_insert"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'pm')
        )
    );

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update"
    ON notifications FOR UPDATE
    TO authenticated
    USING (
        to_user_id = auth.uid()
        OR to_role = (SELECT role FROM profiles WHERE id = auth.uid())
    );

-- ---- FORECASTS ----
CREATE POLICY "forecasts_select"
    ON forecasts FOR SELECT
    TO authenticated
    USING (true);

-- ML service writes via service_role key (bypasses RLS)
-- No insert/delete policy needed for authenticated users

-- ---- CONFIG ----
CREATE POLICY "config_select"
    ON config FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "config_update_admin"
    ON config FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ---- HISTORICAL STAFFING ----
CREATE POLICY "historical_select"
    ON historical_staffing FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- 13. REALTIME (for Next.js subscriptions)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks, assignments, requests, notifications;
