-- ============================================================
-- Migration 010: Forecasts-Tabelle für ML-Tagesprognose umbauen
-- ============================================================
-- Altes Modell war zonenbasiert (zone, shift_slot, predicted_count).
-- Neues Modell ist tagesbasiert, weil ml/forecast.py einen
-- Abhaengigkeitsgraph ueber alle 9 Build-Week-Tage berechnet.
-- Das ML-Skript schreibt genau eine Zeile pro Tag (1–9).
-- ============================================================

-- Alte Daten zuerst loeschen, weil sich die Spaltenstruktur komplett aendert
-- und bestehende Zeilen mit den neuen NOT NULL-Spalten inkompatibel waeren
DELETE FROM forecasts;

-- Alte spaltenbasierte Struktur entfernen (IF EXISTS verhindert Fehler
-- wenn die Migration versehentlich zweimal laeuft)
ALTER TABLE forecasts DROP COLUMN IF EXISTS zone;
ALTER TABLE forecasts DROP COLUMN IF EXISTS shift_slot;
ALTER TABLE forecasts DROP COLUMN IF EXISTS predicted_count;

-- Neue Spalten fuer das tagesbasierte Prognosemodell
ALTER TABLE forecasts ADD COLUMN day INTEGER NOT NULL;
ALTER TABLE forecasts ADD COLUMN predicted_people INTEGER NOT NULL;
-- Default 'on_track' damit der Status nie NULL sein kann, auch bei alten Zeilen
ALTER TABLE forecasts ADD COLUMN status TEXT NOT NULL DEFAULT 'on_track';
-- tasks_active ist nullable: an Tagen ohne aktive Aufgaben bleibt die Spalte leer
ALTER TABLE forecasts ADD COLUMN tasks_active TEXT;

-- Nur Tage 1–9 erlauben (entspricht der Build-Week-Laenge)
ALTER TABLE forecasts ADD CONSTRAINT forecasts_day_range
    CHECK (day BETWEEN 1 AND 9);

-- Enum-Werte als CHECK erzwingen, weil Supabase kein nativer ENUM-Typ ist
-- und das Frontend genau diese drei Strings erwartet
ALTER TABLE forecasts ADD CONSTRAINT forecasts_status_values
    CHECK (status IN ('on_track', 'at_risk', 'behind'));

-- Jeder Tag darf nur einmal vorkommen — das ML-Skript loescht vorher alle Zeilen,
-- dieser Constraint ist eine zusaetzliche Sicherung gegen doppelte Eintraege
ALTER TABLE forecasts ADD CONSTRAINT forecasts_day_unique
    UNIQUE (day);
