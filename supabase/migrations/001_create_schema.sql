-- ============================================================
-- START CREW — Database Schema Migration
-- Creates all tables for the crew coordination app.
-- Supabase (PostgreSQL) — runs via Management API or SQL Editor.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TEAMS (created first to break circular reference)
-- ============================================================
CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    zone TEXT NOT NULL,
    lead_id UUID,                       -- added via ALTER after users exists
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USERS (references teams; linked to Supabase Auth)
-- ============================================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE,                -- links to auth.users(id) after signup
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'volunteer'
        CHECK (role IN ('admin', 'pm', 'lead', 'volunteer')),
    phone TEXT,
    avatar_url TEXT,
    team_id INTEGER REFERENCES teams(team_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the foreign key from teams.lead_id -> users.user_id
ALTER TABLE teams
    ADD CONSTRAINT fk_teams_lead
    FOREIGN KEY (lead_id) REFERENCES users(user_id);

-- ============================================================
-- 3. TASKS (construction plan items + live task board)
-- ============================================================
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    zone TEXT,
    task_name TEXT NOT NULL,
    day INTEGER,                        -- build week day (1-9)
    shift_start TEXT,                   -- e.g. "08:00"
    shift_end TEXT,                     -- e.g. "10:00"
    duration_hours REAL,                -- estimated hours from plan
    people_needed INTEGER DEFAULT 1,
    slots_remaining INTEGER DEFAULT 1,
    skills TEXT,
    priority TEXT DEFAULT 'normal'
        CHECK (priority IN ('critical', 'warning', 'normal')),
    description TEXT,
    depends_on TEXT,                    -- what this task roadblocks
    status TEXT DEFAULT 'open'
        CHECK (status IN ('open', 'filled', 'complete')),
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT slots_not_negative CHECK (slots_remaining >= 0)
);

-- ============================================================
-- 4. ASSIGNMENTS (volunteer <-> task link)
-- ============================================================
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(task_id),
    volunteer_id UUID NOT NULL REFERENCES users(user_id),
    team_id INTEGER REFERENCES teams(team_id),
    status TEXT DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'complete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. REQUESTS (team leads requesting more people)
-- ============================================================
CREATE TABLE requests (
    request_id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(team_id),
    zone TEXT,
    people_needed INTEGER NOT NULL DEFAULT 1,
    shift_start TEXT,
    shift_end TEXT,
    skills TEXT,
    notes TEXT,
    status TEXT DEFAULT 'open'
        CHECK (status IN ('open', 'partial', 'filled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. NOTIFICATIONS (PM -> leads messaging)
-- ============================================================
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    from_user_id UUID REFERENCES users(user_id),
    to_role TEXT,
    to_user_id UUID REFERENCES users(user_id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. FORECASTS (ML predictions stored per refresh)
-- ============================================================
CREATE TABLE forecasts (
    forecast_id SERIAL PRIMARY KEY,
    zone TEXT NOT NULL,
    shift_slot TEXT NOT NULL,           -- e.g. "07:00", "09:00"
    predicted_count INTEGER NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. CONFIG (key-value store for app settings)
-- ============================================================
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. HISTORICAL STAFFING (2024/2025 data for ML training)
-- ============================================================
CREATE TABLE historical_staffing (
    id SERIAL PRIMARY KEY,
    task_name TEXT NOT NULL,
    depends_on TEXT,
    day INTEGER NOT NULL,
    year INTEGER NOT NULL,
    people INTEGER,
    duration_hours REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ROW LEVEL SECURITY — enable on all tables
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_staffing ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all tables (basic policy)
-- More granular policies will be added per role later
CREATE POLICY "Authenticated users can read users"
    ON users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read teams"
    ON teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read tasks"
    ON tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read assignments"
    ON assignments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read requests"
    ON requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read forecasts"
    ON forecasts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read config"
    ON config FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read historical_staffing"
    ON historical_staffing FOR SELECT
    TO authenticated
    USING (true);

-- Service role bypasses RLS, so admin operations via
-- service_role key work without extra policies.

-- Allow authenticated users to insert/update where needed
CREATE POLICY "Authenticated users can insert assignments"
    ON assignments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
    ON tasks FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert requests"
    ON requests FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can insert notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update assignments"
    ON assignments FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update requests"
    ON requests FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert tasks"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can insert forecasts"
    ON forecasts FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete forecasts"
    ON forecasts FOR DELETE
    TO authenticated
    USING (true);
