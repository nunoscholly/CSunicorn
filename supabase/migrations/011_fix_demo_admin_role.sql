-- ============================================================
-- Migration 011 — Legacy-Demo-Admin reparieren
--
-- Hintergrund: Der dokumentierte Login admin@start.test / test123
-- aus der Aufgabenstellung wurde in früheren Seed-Läufen angelegt,
-- bevor das Trigger-Mapping für `raw_user_meta_data.role` zuverlässig
-- lief. Resultat: das profiles-Row bleibt auf dem Default 'volunteer'
-- und der Admin-Route-Guard in src/app/(dashboard)/admin/page.tsx
-- leitet den Login weiter aufs Volunteer-Dashboard. Siehe
-- docs/ux_findings_playwright.md §BUG-1.
--
-- Fix: das Profil zur Demo-Admin-Rolle hochziehen. Wir matchen per
-- Email-Spalte — die UUID aus scripts/seed-demo.mjs (…8000-…000000)
-- ist nur dann verlässlich, wenn der Seed über die Admin-API lief.
-- Idempotent: mehrfaches Ausführen ändert nichts mehr.
-- ============================================================

BEGIN;

UPDATE profiles
SET role = 'admin',
    name = CASE WHEN name = '' THEN 'Demo Admin' ELSE name END,
    is_active = true
WHERE email = 'admin@start.test';

COMMIT;
