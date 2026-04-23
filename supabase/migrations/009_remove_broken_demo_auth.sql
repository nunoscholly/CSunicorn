-- ============================================================
-- Migration 009 — Kaputte Demo-Auth-Einträge entfernen
--
-- Die Migration 008 hat Auth-User per direktem INSERT INTO auth.users
-- angelegt. Das funktioniert nicht zuverlässig auf gehosteten
-- Supabase-Instanzen (Password-Variant-Mismatch, fehlende Identity-
-- Felder je nach Auth-Schema-Version). Ergebnis: Login schlägt fehl
-- mit "Invalid login credentials".
--
-- Diese Migration löscht alle @startcrew.test Rows aus auth.users.
-- CASCADE räumt profiles, assignments, notifications etc. mit auf.
--
-- Danach: `npm run seed:demo` ausführen — das erstellt die User
-- über die offizielle Admin-API (supabase.auth.admin.createUser).
-- ============================================================

BEGIN;

-- Alle Demo-Auth-User entfernen (CASCADE löscht abhängige Rows)
DELETE FROM auth.users WHERE email LIKE '%@startcrew.test';

-- Verwaiste Demo-Daten ohne FK-Beziehung zu auth.users ebenfalls bereinigen
DELETE FROM tasks WHERE task_name LIKE '%[DEMO]';
DELETE FROM requests WHERE notes LIKE '[DEMO]%';
DELETE FROM notifications WHERE message LIKE '[DEMO]%';
DELETE FROM forecasts;
DELETE FROM teams WHERE name LIKE '[DEMO]%';

-- Seed-Hilfsfunktion aus Migration 008 droppen (falls sie noch existiert)
DROP FUNCTION IF EXISTS public.seed_create_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

COMMIT;
