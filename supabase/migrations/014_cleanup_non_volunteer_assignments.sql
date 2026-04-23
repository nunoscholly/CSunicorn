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
