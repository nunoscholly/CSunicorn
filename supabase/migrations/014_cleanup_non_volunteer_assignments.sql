-- ============================================================
-- Migration 014 — Seed-Rest von nicht-Volunteer-Assignments entfernen
--
-- Hintergrund: Bevor der Server-Action-Guard in
-- src/app/(dashboard)/volunteer/actions.ts Non-Volunteers beim
-- "Übernehmen" blockiert hat, konnte z. B. der Admin einen
-- Task auf sich selbst buchen. Die UI-Regression (BUG-4) ist
-- inzwischen gefixt, aber die Restdaten in `assignments` bleiben:
-- Admin taucht weiter als "eingeteilt" auf, Catering zeigt 5/6
-- statt 4/6 (docs/ux_findings_playwright_session2.md §BUG-S7).
--
-- Fix: alle Assignments löschen, deren volunteer_id auf ein Profil
-- mit Rolle != 'volunteer' zeigt. Vorher slots_remaining auf den
-- zugehörigen Tasks wieder hochzählen, sonst verliert der Task
-- die freigewordene Kapazität.
-- ============================================================

BEGIN;

-- slots_remaining am Task wieder hochziehen für jeden Assignment-Row,
-- der gleich gelöscht wird (nur aktive Assignments zählen im Counter).
UPDATE tasks t
SET slots_remaining = LEAST(t.people_needed, t.slots_remaining + staff.n)
FROM (
    SELECT a.task_id, COUNT(*)::int AS n
    FROM assignments a
    JOIN profiles p ON p.id = a.volunteer_id
    WHERE p.role <> 'volunteer'
      AND a.status = 'assigned'
    GROUP BY a.task_id
) staff
WHERE staff.task_id = t.id;

-- Und jetzt die fraglichen Assignment-Rows löschen.
DELETE FROM assignments a
USING profiles p
WHERE p.id = a.volunteer_id
  AND p.role <> 'volunteer';

COMMIT;
