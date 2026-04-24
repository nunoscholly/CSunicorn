-- ============================================================
-- Migration 013 — Demo-Text bereinigen (BUG-5 / BUG-6)
--
-- 1. ASCII-Umlaute in task_name durch echte Umlaute ersetzen
-- 2. [DEMO]-Suffix aus task_name entfernen (saubere UI)
--
-- notes/message behalten den [DEMO]-Tag, weil das Seed-Skript
-- ihn fuer idempotentes Cleanup braucht (DELETE ... LIKE '[DEMO]%').
-- ============================================================

BEGIN;

-- ASCII-Umlaute in Tasks korrigieren
UPDATE tasks SET task_name = REPLACE(task_name, 'Buehne', 'Bühne') WHERE task_name LIKE '%Buehne%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Kueche', 'Küche') WHERE task_name LIKE '%Kueche%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Notausgaenge', 'Notausgänge') WHERE task_name LIKE '%Notausgaenge%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Stuehle', 'Stühle') WHERE task_name LIKE '%Stuehle%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Kuehlschraenke', 'Kühlschränke') WHERE task_name LIKE '%Kuehlschraenke%';
UPDATE tasks SET task_name = REPLACE(task_name, 'Getraenke', 'Getränke') WHERE task_name LIKE '%Getraenke%';

-- [DEMO]-Suffix aus Task-Namen entfernen
UPDATE tasks SET task_name = TRIM(REPLACE(task_name, '[DEMO]', '')) WHERE task_name LIKE '%[DEMO]%';

COMMIT;
