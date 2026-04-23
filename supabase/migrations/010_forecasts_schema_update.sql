-- ============================================================
-- Migration 010 — Forecasts-Schema fuer ML-Service aktualisieren
--
-- Das ML-Skript prognostiziert pro Zone und Tag (nicht pro Timeslot).
-- Alte Spalten (shift_slot, predicted_count) werden durch die neuen
-- ersetzt: day, predicted_people, status, tasks_active.
-- ============================================================

BEGIN;

-- Alte Spalten entfernen
ALTER TABLE forecasts DROP COLUMN IF EXISTS shift_slot;
ALTER TABLE forecasts DROP COLUMN IF EXISTS predicted_count;

-- Neue Spalten hinzufuegen
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS day INTEGER;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS predicted_people INTEGER NOT NULL DEFAULT 0;
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'outdated'));
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS tasks_active INTEGER NOT NULL DEFAULT 0;

-- Zone und generated_at bleiben bestehen

COMMIT;
