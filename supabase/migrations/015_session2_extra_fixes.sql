-- ============================================================
-- Migration 015 — Session-2-Nachzügler aus docs/ux_findings_playwright_session2.md
--
-- Die Migrationen 011-014 auf main decken die offensichtlichen Fälle
-- (admin@startcrew.test-Rolle, notifications-RLS, task_name-Cleanup,
-- non-volunteer-Assignments) bereits ab. Diese Migration räumt die
-- Rest-Artefakte auf, die während der zweiten Playwright-Exploration
-- am 2026-04-23 aufgefallen sind:
--
-- 1) Legacy-Demo-Admin admin@start.test (Login aus der Aufgabenstellung,
--    nicht identisch mit admin@startcrew.test) wird ebenfalls auf
--    role='admin' gehoben (BUG-1 / BUG-S3 · erweitert 011).
--
-- 2) ASCII-Umlaute und [DEMO]-Suffix blieben in Feldern, die 013 nicht
--    erfasst: tasks.description, notifications.message, requests.notes
--    und teams.name. Zusätzliche Patterns: Buehnendeko, Gaeste, Buero,
--    fuer (BUG-5 / BUG-6 · erweitert 013).
--
-- 3) Nachdem 014 auf main Assignments für Non-Volunteers gelöscht hat,
--    stimmt tasks.slots_remaining nicht mehr mit der tatsächlichen
--    Belegung überein. Wir syncen die Spalte einmalig frisch aus
--    assignments.status='assigned' heraus (BUG-S7 · Ergänzung zu 014).
--
-- Idempotent: alle Anweisungen sind REPLACE/regex_replace/recalculate
-- und greifen nur, wo noch etwas zu ändern ist.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) admin@start.test auf Admin-Rolle heben (Legacy-Seed-Account)
-- ------------------------------------------------------------
-- Der Aufgaben-Brief bat darum, sich mit genau diesem Login anzumelden.
-- Ein früher Seed-Lauf hat das profiles-Row aber auf dem Default
-- 'volunteer' belassen, sodass der Admin-Route-Guard den User aufs
-- Volunteer-Dashboard umleitete. Idempotent: mehrfaches Ausführen
-- ändert nichts, weil role bereits 'admin' ist.
UPDATE profiles
SET role = 'admin',
    name = CASE WHEN name = '' OR name IS NULL THEN 'Demo Admin' ELSE name END,
    is_active = true
WHERE email = 'admin@start.test';

-- ------------------------------------------------------------
-- 2) Restliche ASCII-Umlaute + [DEMO]-Stripping
-- ------------------------------------------------------------
-- 013 hat nur tasks.task_name und einen kleinen Teil der Umlaute
-- behandelt. Hier ziehen wir description/message/notes/team_name nach
-- und fügen die Patterns hinzu, die bisher fehlten.

-- Zusätzliche Umlaut-Patterns für tasks.task_name und tasks.description
UPDATE tasks SET task_name = REPLACE(task_name, 'Buehnendeko', 'Bühnendeko');
UPDATE tasks SET task_name = REPLACE(task_name, 'Gaeste', 'Gäste');
UPDATE tasks SET task_name = REPLACE(task_name, 'Buero', 'Büro');
UPDATE tasks SET task_name = REPLACE(task_name, 'fuer ', 'für ');
UPDATE tasks SET task_name = REPLACE(task_name, ' fuer', ' für');

UPDATE tasks SET description = REPLACE(description, 'Notausgaenge', 'Notausgänge');
UPDATE tasks SET description = REPLACE(description, 'Buehnendeko', 'Bühnendeko');
UPDATE tasks SET description = REPLACE(description, 'Getraenke', 'Getränke');
UPDATE tasks SET description = REPLACE(description, 'Gaeste', 'Gäste');
UPDATE tasks SET description = REPLACE(description, 'Buero', 'Büro');
UPDATE tasks SET description = REPLACE(description, 'fuer ', 'für ');
UPDATE tasks SET description = REPLACE(description, ' fuer', ' für');

-- notifications.message
UPDATE notifications SET message = REPLACE(message, 'Notausgaenge', 'Notausgänge');
UPDATE notifications SET message = REPLACE(message, 'Buehnendeko', 'Bühnendeko');
UPDATE notifications SET message = REPLACE(message, 'Getraenke', 'Getränke');
UPDATE notifications SET message = REPLACE(message, 'Gaeste', 'Gäste');
UPDATE notifications SET message = REPLACE(message, 'Buero', 'Büro');
UPDATE notifications SET message = REPLACE(message, 'fuer ', 'für ');
UPDATE notifications SET message = REPLACE(message, ' fuer', ' für');

-- requests.notes
UPDATE requests SET notes = REPLACE(notes, 'Notausgaenge', 'Notausgänge') WHERE notes IS NOT NULL;
UPDATE requests SET notes = REPLACE(notes, 'Buehnendeko', 'Bühnendeko') WHERE notes IS NOT NULL;
UPDATE requests SET notes = REPLACE(notes, 'Getraenke', 'Getränke') WHERE notes IS NOT NULL;
UPDATE requests SET notes = REPLACE(notes, 'Gaeste', 'Gäste') WHERE notes IS NOT NULL;
UPDATE requests SET notes = REPLACE(notes, 'Buero', 'Büro') WHERE notes IS NOT NULL;
UPDATE requests SET notes = REPLACE(notes, 'fuer ', 'für ') WHERE notes IS NOT NULL;
UPDATE requests SET notes = REPLACE(notes, ' fuer', ' für') WHERE notes IS NOT NULL;

-- [DEMO]-Tag auch aus Feldern ziehen, die 013 noch stehen liess.
-- regex_replace mit \s* greift ' [DEMO]' am Ende und '[DEMO] ' am Anfang.
UPDATE tasks
SET description = TRIM(regexp_replace(description, '\s*\[DEMO\]\s*', ' ', 'g'))
WHERE description IS NOT NULL;

UPDATE notifications
SET message = TRIM(regexp_replace(message, '\s*\[DEMO\]\s*', ' ', 'g'));

UPDATE requests
SET notes = TRIM(regexp_replace(notes, '\s*\[DEMO\]\s*', ' ', 'g'))
WHERE notes IS NOT NULL;

UPDATE teams
SET name = TRIM(regexp_replace(name, '\s*\[DEMO\]\s*', ' ', 'g'));

-- ------------------------------------------------------------
-- 3) slots_remaining neu synchronisieren
-- ------------------------------------------------------------
-- 014 hat Assignments für Non-Volunteers gelöscht, ohne den Counter
-- zurückzudrehen. Resultat: tasks.slots_remaining zeigt zu wenig
-- freie Plätze, Tasks erscheinen weiter als "voll". Sync von Grund
-- auf aus dem aktuellen Assignment-Stand — unabhängig davon, wie oft
-- die Migration läuft, gleicht sie die Spalte immer korrekt ab.
UPDATE tasks t
SET slots_remaining = GREATEST(
    0,
    t.people_needed - (
        SELECT COUNT(*)::int
        FROM assignments a
        WHERE a.task_id = t.id
          AND a.status = 'assigned'
    )
);

COMMIT;
