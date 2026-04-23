-- ============================================================
-- Migration 013 — Demo-Text aufräumen (Umlaute + [DEMO]-Suffix)
--
-- Hintergrund: Ältere Seed-Läufe haben die deutschen Task- und
-- Notification-Strings mit ASCII-Transliteration (Buero, Gaeste,
-- Notausgaenge, fuer …) und einem "[DEMO]"-Suffix auf Text-Feldern
-- angelegt. Beides leakt in die UI und macht das Demo für die
-- Bewertung hässlich — siehe docs/ux_findings_playwright.md
-- §BUG-5 und §BUG-6. Der aktuelle Seed (scripts/seed-demo.mjs)
-- schreibt bereits sauberen Text, aber historische Rows müssen
-- nachgezogen werden.
--
-- Idempotent: REPLACE ist no-op wenn das Pattern nicht vorkommt,
-- regexp_replace matcht beim zweiten Lauf nichts mehr.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) ASCII-Umlaute in UTF-8 zurückverwandeln.
-- ------------------------------------------------------------
-- Reihenfolge: längere Patterns zuerst, damit z. B. "Buehnendeko"
-- nicht vor "Bue" greift. Grosse/Kleinschreibung unterscheiden.

-- tasks.task_name ---------------------------------------------
UPDATE tasks SET task_name = REPLACE(task_name, 'Notausgaenge', 'Notausgänge');
UPDATE tasks SET task_name = REPLACE(task_name, 'Buehnendeko', 'Bühnendeko');
UPDATE tasks SET task_name = REPLACE(task_name, 'Getraenke', 'Getränke');
UPDATE tasks SET task_name = REPLACE(task_name, 'Gaeste', 'Gäste');
UPDATE tasks SET task_name = REPLACE(task_name, 'Buero', 'Büro');
UPDATE tasks SET task_name = REPLACE(task_name, 'fuer ', 'für ');
UPDATE tasks SET task_name = REPLACE(task_name, ' fuer', ' für');

-- tasks.description -------------------------------------------
UPDATE tasks SET description = REPLACE(description, 'Notausgaenge', 'Notausgänge');
UPDATE tasks SET description = REPLACE(description, 'Buehnendeko', 'Bühnendeko');
UPDATE tasks SET description = REPLACE(description, 'Getraenke', 'Getränke');
UPDATE tasks SET description = REPLACE(description, 'Gaeste', 'Gäste');
UPDATE tasks SET description = REPLACE(description, 'Buero', 'Büro');
UPDATE tasks SET description = REPLACE(description, 'fuer ', 'für ');
UPDATE tasks SET description = REPLACE(description, ' fuer', ' für');

-- notifications.message ---------------------------------------
UPDATE notifications SET message = REPLACE(message, 'Notausgaenge', 'Notausgänge');
UPDATE notifications SET message = REPLACE(message, 'Buehnendeko', 'Bühnendeko');
UPDATE notifications SET message = REPLACE(message, 'Getraenke', 'Getränke');
UPDATE notifications SET message = REPLACE(message, 'Gaeste', 'Gäste');
UPDATE notifications SET message = REPLACE(message, 'Buero', 'Büro');
UPDATE notifications SET message = REPLACE(message, 'fuer ', 'für ');
UPDATE notifications SET message = REPLACE(message, ' fuer', ' für');

-- requests.notes ----------------------------------------------
UPDATE requests SET notes = REPLACE(notes, 'Notausgaenge', 'Notausgänge');
UPDATE requests SET notes = REPLACE(notes, 'Buehnendeko', 'Bühnendeko');
UPDATE requests SET notes = REPLACE(notes, 'Getraenke', 'Getränke');
UPDATE requests SET notes = REPLACE(notes, 'Gaeste', 'Gäste');
UPDATE requests SET notes = REPLACE(notes, 'Buero', 'Büro');
UPDATE requests SET notes = REPLACE(notes, 'fuer ', 'für ');
UPDATE requests SET notes = REPLACE(notes, ' fuer', ' für');

-- ------------------------------------------------------------
-- 2) [DEMO]-Suffix/Prefix aus allen sichtbaren Text-Feldern entfernen.
-- ------------------------------------------------------------
-- Wir wollen " [DEMO]" am Ende und "[DEMO] " am Anfang weg, und
-- auch lose stehende " [DEMO] " mitten im Text. TRIM räumt Leerraum.

UPDATE tasks
SET task_name = TRIM(regexp_replace(task_name, '\s*\[DEMO\]\s*', ' ', 'g'));

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

COMMIT;
