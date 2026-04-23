-- ============================================================
-- Migration 012 — notifications_select um Sender-Perspektive erweitern
--
-- Die alte Policy aus Migration 004 erlaubt nur Empfängern SELECT:
--     to_user_id = auth.uid() OR to_role = <my_role>
--
-- Konsequenz: Ein PM, der einen Broadcast an alle Leads schickt, kann
-- die eigene Nachricht nie sehen. Das PM-Panel "Zuletzt verschickt"
-- bleibt permanent auf dem Empty-State "Noch nichts gesendet".
-- Siehe docs/ux_findings_playwright.md §BUG-3.
--
-- Fix: dritten Branch "from_user_id = auth.uid()" aufnehmen, damit
-- Absender ihre eigenen Nachrichten lesen können. Das notifications-
-- insert/update-Policy-Paar bleibt unangetastet (nur admin/pm dürfen
-- senden, jeder Empfänger darf selbst auf "gelesen" setzen).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "notifications_select" ON notifications;

CREATE POLICY "notifications_select"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        to_user_id = auth.uid()
        OR to_role = (SELECT role FROM profiles WHERE id = auth.uid())
        OR from_user_id = auth.uid()
    );

COMMIT;
