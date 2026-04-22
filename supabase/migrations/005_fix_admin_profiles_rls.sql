-- ============================================================
-- Fix: Admins need to see ALL profiles (including deactivated)
-- so they can reactivate users from the admin panel.
-- Non-admins still only see active profiles.
-- ============================================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        is_active = true
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
