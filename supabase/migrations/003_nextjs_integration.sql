-- ============================================================
-- START CREW — Next.js Integration Setup
-- Enables Realtime, adds auth.uid()-based RLS policies,
-- and auto-confirm for email signups.
-- ============================================================

-- Enable Realtime on tables the frontend subscribes to
ALTER PUBLICATION supabase_realtime ADD TABLE tasks, assignments, requests, notifications;

-- Users can update their own profile (matched via Supabase Auth ID)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (auth_id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (auth_id = auth.uid());
