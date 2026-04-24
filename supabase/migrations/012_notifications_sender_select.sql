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
