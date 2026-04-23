-- ============================================================
-- START CREW — Demo-Seed-Daten
--
-- Befüllt die Datenbank so, dass alle vier Views (Admin, PM, Team-Lead,
-- Volunteer) direkt getestet werden können. Alle Demo-Datensätze sind
-- durch Email-Domain '@startcrew.test' bzw. Tags in Text-Feldern
-- erkennbar, damit die Migration idempotent ist (mehrfach ausführbar).
--
-- WICHTIG:
-- - Passwort für alle Demo-Accounts: StartCrew123!
-- - Emails: admin@startcrew.test, pm.aier@startcrew.test, ...
-- - Ausführen im Supabase-SQL-Editor. CASCADE-Cleanup greift auto.
-- ============================================================

BEGIN;

-- pgcrypto für crypt() / gen_salt('bf') (bcrypt-Passwort-Hash)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SCHRITT 0 — Cleanup: vorherige Demo-Daten löschen
-- ============================================================
-- Reihenfolge berücksichtigt FK-Constraints:
--   * auth.users → cascades auf profiles, auch auf assignments via
--     volunteer_id und notifications via from_user_id/to_user_id
--   * tasks-Delete → cascades auf assignments via task_id
--   * Forecasts werden komplett gewipet (die werden eh vom ML-Skript
--     bei Bedarf neu generiert).

DELETE FROM auth.users WHERE email LIKE '%@startcrew.test';
DELETE FROM tasks WHERE task_name LIKE '%[DEMO]';
DELETE FROM requests WHERE notes LIKE '[DEMO]%';
DELETE FROM notifications WHERE message LIKE '[DEMO]%';
DELETE FROM forecasts;
DELETE FROM teams WHERE name LIKE '[DEMO]%';

-- ============================================================
-- SCHRITT 1 — Hilfsfunktion zum Anlegen von Auth-Usern
-- ============================================================
-- Erstellt einen Auth-User + zugehörigen Identity-Eintrag und füllt
-- Phone/Avatar im Profil (das der Trigger handle_new_user bereits
-- angelegt hat). Nach Ausführung der Migration droppen wir die Funktion
-- wieder — sie existiert nur für die Dauer des Seeds.

CREATE OR REPLACE FUNCTION public.seed_create_user(
    p_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role TEXT,
    p_phone TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Auth-Eintrag: alle Pflichtfelder gemäss Supabase-Auth-Schema.
    -- email_confirmed_at=now() signalisiert einen aktiven, bestätigten User.
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change,
        email_change_token_new, recovery_token
    ) VALUES (
        p_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', p_name, 'role', p_role),
        now(), now(),
        '', '', '', ''
    );

    -- Identity-Eintrag: wird ab Supabase-Auth v2 für Email-Login benötigt.
    INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), p_id, p_id::text, 'email',
        jsonb_build_object('sub', p_id::text, 'email', p_email),
        now(), now(), now()
    );

    -- Telefonnummer im profiles-Eintrag ergänzen (der Trigger hat ihn
    -- bereits mit name+role aus raw_user_meta_data angelegt).
    UPDATE public.profiles SET phone = p_phone WHERE id = p_id;
END;
$$;

-- ============================================================
-- SCHRITT 2 — Demo-User anlegen
-- ============================================================
-- UUIDs fest vergeben, damit wir weiter unten stabil darauf referenzieren.

-- Admin
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000001'::uuid,
    'admin@startcrew.test', 'StartCrew123!',
    'Ada Admin', 'admin', '+41 79 100 00 01'
);

-- Project Managers
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000002'::uuid,
    'pm.aier@startcrew.test', 'StartCrew123!',
    'Stefan Aier', 'pm', '+41 79 100 00 02'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000003'::uuid,
    'pm.mayer@startcrew.test', 'StartCrew123!',
    'Clara Mayer', 'pm', '+41 79 100 00 03'
);

-- Team-Leads (einer pro Zone)
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000010'::uuid,
    'lead.stagea@startcrew.test', 'StartCrew123!',
    'Luca Hoffmann', 'lead', '+41 79 100 00 10'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000011'::uuid,
    'lead.stageb@startcrew.test', 'StartCrew123!',
    'Maya Keller', 'lead', '+41 79 100 00 11'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000012'::uuid,
    'lead.catering@startcrew.test', 'StartCrew123!',
    'Jonas Weber', 'lead', '+41 79 100 00 12'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000013'::uuid,
    'lead.entrance@startcrew.test', 'StartCrew123!',
    'Sara Frei', 'lead', '+41 79 100 00 13'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000014'::uuid,
    'lead.backstage@startcrew.test', 'StartCrew123!',
    'Tim Brunner', 'lead', '+41 79 100 00 14'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000015'::uuid,
    'lead.av@startcrew.test', 'StartCrew123!',
    'Emma Mueller', 'lead', '+41 79 100 00 15'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000016'::uuid,
    'lead.mainhall@startcrew.test', 'StartCrew123!',
    'Noah Bucher', 'lead', '+41 79 100 00 16'
);

-- Volunteers (12 Stück)
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000020'::uuid,
    'volunteer01@startcrew.test', 'StartCrew123!',
    'Leon Roth', 'volunteer', '+41 79 200 00 01'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000021'::uuid,
    'volunteer02@startcrew.test', 'StartCrew123!',
    'Mia Schmid', 'volunteer', '+41 79 200 00 02'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000022'::uuid,
    'volunteer03@startcrew.test', 'StartCrew123!',
    'Finn Graf', 'volunteer', '+41 79 200 00 03'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000023'::uuid,
    'volunteer04@startcrew.test', 'StartCrew123!',
    'Lea Vogel', 'volunteer', '+41 79 200 00 04'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000024'::uuid,
    'volunteer05@startcrew.test', 'StartCrew123!',
    'Jan Bosch', 'volunteer', '+41 79 200 00 05'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000025'::uuid,
    'volunteer06@startcrew.test', 'StartCrew123!',
    'Lena Huber', 'volunteer', '+41 79 200 00 06'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000026'::uuid,
    'volunteer07@startcrew.test', 'StartCrew123!',
    'Nico Ammann', 'volunteer', '+41 79 200 00 07'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000027'::uuid,
    'volunteer08@startcrew.test', 'StartCrew123!',
    'Amelie Gerber', 'volunteer', '+41 79 200 00 08'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000028'::uuid,
    'volunteer09@startcrew.test', 'StartCrew123!',
    'David Kunz', 'volunteer', '+41 79 200 00 09'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-000000000029'::uuid,
    'volunteer10@startcrew.test', 'StartCrew123!',
    'Sofia Lang', 'volunteer', '+41 79 200 00 10'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-00000000002a'::uuid,
    'volunteer11@startcrew.test', 'StartCrew123!',
    'Felix Bucher', 'volunteer', '+41 79 200 00 11'
);
SELECT public.seed_create_user(
    '00000000-0000-4000-8000-00000000002b'::uuid,
    'volunteer12@startcrew.test', 'StartCrew123!',
    'Nina Berger', 'volunteer', '+41 79 200 00 12'
);

-- ============================================================
-- SCHRITT 3 — Teams anlegen (mit Lead-Zuordnung)
-- ============================================================
-- Ein Team pro Zone. lead_id zeigt auf den entsprechenden Lead.
-- Team-ID-UUIDs fest vergeben, damit die Assignments weiter unten
-- stabil darauf referenzieren können.

INSERT INTO teams (id, name, zone, lead_id) VALUES
    ('00000000-0000-4000-9000-000000000001',
     '[DEMO] Stage A Crew', 'Stage A',
     '00000000-0000-4000-8000-000000000010'),
    ('00000000-0000-4000-9000-000000000002',
     '[DEMO] Stage B Crew', 'Stage B',
     '00000000-0000-4000-8000-000000000011'),
    ('00000000-0000-4000-9000-000000000003',
     '[DEMO] Catering Crew', 'Catering',
     '00000000-0000-4000-8000-000000000012'),
    ('00000000-0000-4000-9000-000000000004',
     '[DEMO] Entrance Crew', 'Entrance',
     '00000000-0000-4000-8000-000000000013'),
    ('00000000-0000-4000-9000-000000000005',
     '[DEMO] Backstage Crew', 'Backstage',
     '00000000-0000-4000-8000-000000000014'),
    ('00000000-0000-4000-9000-000000000006',
     '[DEMO] AV/Tech Crew', 'AV/Tech',
     '00000000-0000-4000-8000-000000000015'),
    ('00000000-0000-4000-9000-000000000007',
     '[DEMO] Main Hall Crew', 'Main Hall',
     '00000000-0000-4000-8000-000000000016');

-- ============================================================
-- SCHRITT 4 — profiles.team_id setzen
-- ============================================================
-- Jeder Lead kriegt die team_id seines Teams. Volunteers verteilen wir
-- gleichmässig auf die Teams (2 pro Team, bei 12 Volunteers und 7 Teams).

-- Leads
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000001'
    WHERE id = '00000000-0000-4000-8000-000000000010';
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000002'
    WHERE id = '00000000-0000-4000-8000-000000000011';
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000003'
    WHERE id = '00000000-0000-4000-8000-000000000012';
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000004'
    WHERE id = '00000000-0000-4000-8000-000000000013';
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000005'
    WHERE id = '00000000-0000-4000-8000-000000000014';
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000006'
    WHERE id = '00000000-0000-4000-8000-000000000015';
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000007'
    WHERE id = '00000000-0000-4000-8000-000000000016';

-- Volunteers — 2 pro Team für 5 Zonen, 2 bleiben frei (zum Testen des
-- Commit-Buttons).
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000001'
    WHERE id IN ('00000000-0000-4000-8000-000000000020',
                 '00000000-0000-4000-8000-000000000021');
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000002'
    WHERE id IN ('00000000-0000-4000-8000-000000000022',
                 '00000000-0000-4000-8000-000000000023');
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000005'
    WHERE id IN ('00000000-0000-4000-8000-000000000024',
                 '00000000-0000-4000-8000-000000000025');
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000006'
    WHERE id IN ('00000000-0000-4000-8000-000000000026',
                 '00000000-0000-4000-8000-000000000027');
UPDATE profiles SET team_id = '00000000-0000-4000-9000-000000000007'
    WHERE id IN ('00000000-0000-4000-8000-000000000028',
                 '00000000-0000-4000-8000-000000000029');
-- volunteer11 + volunteer12 bleiben ohne Team → ideal für Commit-Test.

-- ============================================================
-- SCHRITT 5 — Tasks anlegen
-- ============================================================
-- Mix aus erledigten, teilbesetzten und frischen Tasks. Shifts auf
-- den heutigen Tag (CURRENT_DATE) gelegt, damit "Coverage heute"
-- im PM-Dashboard direkt Daten anzeigt.
--
-- Konvention:
--   * Suffix " [DEMO]" auf task_name erlaubt späteres Cleanup.
--   * slots_remaining = people_needed - bereits zugewiesene Volunteers.
--   * status='complete' wenn der Task durch ist.

-- Stage A (3 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000001',
     'Stage A', 'Traverse aufbauen [DEMO]',
     (CURRENT_DATE + time '08:00'), (CURRENT_DATE + time '10:00'),
     4, 0, 'normal', 'complete',
     'Haupt-Traverse Stage A montieren und auf Zielhöhe ziehen.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000002',
     'Stage A', 'Licht einstellen [DEMO]',
     (CURRENT_DATE + time '13:00'), (CURRENT_DATE + time '17:00'),
     3, 1, 'warning', 'open',
     'Movinglights auf Presets programmieren, Fokus-Run nach Skript.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000003',
     'Stage A', 'Sound-Check [DEMO]',
     (CURRENT_DATE + time '17:00'), (CURRENT_DATE + time '19:00'),
     3, 3, 'critical', 'open',
     'Line-Check, Gainstaging, Playback-Test.',
     '00000000-0000-4000-8000-000000000002');

-- Stage B (3 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000011',
     'Stage B', 'Buehne aufbauen [DEMO]',
     (CURRENT_DATE + time '07:00'), (CURRENT_DATE + time '11:00'),
     5, 0, 'normal', 'complete',
     'Modulbuehne Stage B stellen und Rueckwand montieren.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000012',
     'Stage B', 'Kabel verlegen [DEMO]',
     (CURRENT_DATE + time '12:00'), (CURRENT_DATE + time '15:00'),
     4, 2, 'warning', 'open',
     'Audio- und Netzkabel zur FoH ziehen und saubern abkleben.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000013',
     'Stage B', 'Moderatorenpult [DEMO]',
     (CURRENT_DATE + time '15:00'), (CURRENT_DATE + time '16:30'),
     2, 2, 'normal', 'open',
     'Pult aufstellen, Mikro und Wasser bereitstellen.',
     '00000000-0000-4000-8000-000000000003');

-- Catering (2 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000021',
     'Catering', 'Kueche vorbereiten [DEMO]',
     (CURRENT_DATE + time '06:00'), (CURRENT_DATE + time '09:00'),
     6, 0, 'normal', 'complete',
     'Mise en place, Kaffeemaschinen anheizen.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000022',
     'Catering', 'Mittagsservice [DEMO]',
     (CURRENT_DATE + time '11:30'), (CURRENT_DATE + time '14:00'),
     8, 8, 'warning', 'open',
     'Mittagessen an Buildweek-Crew ausgeben.',
     '00000000-0000-4000-8000-000000000002');

-- Entrance (2 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000031',
     'Entrance', 'Empfangstresen aufstellen [DEMO]',
     (CURRENT_DATE + time '07:00'), (CURRENT_DATE + time '09:00'),
     3, 0, 'normal', 'complete',
     'Tresen aufbauen, Banner anbringen.',
     '00000000-0000-4000-8000-000000000003'),
    ('00000000-0000-4000-a000-000000000032',
     'Entrance', 'Badges sortieren [DEMO]',
     (CURRENT_DATE + time '09:00'), (CURRENT_DATE + time '11:00'),
     4, 4, 'normal', 'open',
     'Badges alphabetisch nach Firma vorsortieren.',
     '00000000-0000-4000-8000-000000000003');

-- Backstage (2 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000041',
     'Backstage', 'Catering Backstage [DEMO]',
     (CURRENT_DATE + time '10:00'), (CURRENT_DATE + time '13:00'),
     3, 1, 'warning', 'open',
     'Kuehlschraenke bestuecken, Getraenke nachliefern.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000042',
     'Backstage', 'Green Room einrichten [DEMO]',
     (CURRENT_DATE + time '13:00'), (CURRENT_DATE + time '15:00'),
     2, 2, 'normal', 'open',
     'Sofa stellen, Getraenke, WLAN-Codes ausdrucken.',
     '00000000-0000-4000-8000-000000000002');

-- AV/Tech (2 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000051',
     'AV/Tech', 'Kameras positionieren [DEMO]',
     (CURRENT_DATE + time '09:00'), (CURRENT_DATE + time '12:00'),
     4, 2, 'critical', 'open',
     'Drei Kameras aufstellen, Stream-Preview checken.',
     '00000000-0000-4000-8000-000000000003'),
    ('00000000-0000-4000-a000-000000000052',
     'AV/Tech', 'Streaming-Check [DEMO]',
     (CURRENT_DATE + time '14:00'), (CURRENT_DATE + time '16:00'),
     2, 2, 'warning', 'open',
     'Upload-Bandbreite, OBS-Scenes, Backup-Stream verifizieren.',
     '00000000-0000-4000-8000-000000000003');

-- Main Hall (3 Tasks)
INSERT INTO tasks (id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, priority, status, description, created_by) VALUES
    ('00000000-0000-4000-a000-000000000061',
     'Main Hall', 'Stuhlreihen ausrichten [DEMO]',
     (CURRENT_DATE + time '08:00'), (CURRENT_DATE + time '11:00'),
     10, 0, 'normal', 'complete',
     '480 Stuehle in 12 Reihen ausrichten.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000062',
     'Main Hall', 'Teppich verlegen [DEMO]',
     (CURRENT_DATE + time '11:00'), (CURRENT_DATE + time '13:30'),
     5, 3, 'warning', 'open',
     'Mittelgang-Teppich und Laeufer zu den Buehnenseiten.',
     '00000000-0000-4000-8000-000000000002'),
    ('00000000-0000-4000-a000-000000000063',
     'Main Hall', 'Notausgaenge markieren [DEMO]',
     (CURRENT_DATE + time '14:00'), (CURRENT_DATE + time '15:00'),
     2, 2, 'critical', 'open',
     'Leuchtmarkierungen anbringen, Fluchtwege freihalten.',
     '00000000-0000-4000-8000-000000000002');

-- ============================================================
-- SCHRITT 6 — Assignments (Volunteers auf Tasks)
-- ============================================================
-- Genau soviel Assignments wie (people_needed - slots_remaining)
-- pro Task, damit die Zahlen zu den Tasks-Eintraegen passen.
-- Alle Status='assigned' (aktive Zuweisung).

INSERT INTO assignments (task_id, volunteer_id, team_id, status) VALUES
    -- Stage A Task 2: 2 Plaetze besetzt
    ('00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-8000-000000000020',
     '00000000-0000-4000-9000-000000000001', 'assigned'),
    ('00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-8000-000000000021',
     '00000000-0000-4000-9000-000000000001', 'assigned'),
    -- Stage B Task 2: 2 Plaetze besetzt
    ('00000000-0000-4000-a000-000000000012',
     '00000000-0000-4000-8000-000000000022',
     '00000000-0000-4000-9000-000000000002', 'assigned'),
    ('00000000-0000-4000-a000-000000000012',
     '00000000-0000-4000-8000-000000000023',
     '00000000-0000-4000-9000-000000000002', 'assigned'),
    -- Backstage Task 1: 2 Plaetze besetzt
    ('00000000-0000-4000-a000-000000000041',
     '00000000-0000-4000-8000-000000000024',
     '00000000-0000-4000-9000-000000000005', 'assigned'),
    ('00000000-0000-4000-a000-000000000041',
     '00000000-0000-4000-8000-000000000025',
     '00000000-0000-4000-9000-000000000005', 'assigned'),
    -- AV/Tech Task 1: 2 Plaetze besetzt
    ('00000000-0000-4000-a000-000000000051',
     '00000000-0000-4000-8000-000000000026',
     '00000000-0000-4000-9000-000000000006', 'assigned'),
    ('00000000-0000-4000-a000-000000000051',
     '00000000-0000-4000-8000-000000000027',
     '00000000-0000-4000-9000-000000000006', 'assigned'),
    -- Main Hall Task 2: 2 Plaetze besetzt
    ('00000000-0000-4000-a000-000000000062',
     '00000000-0000-4000-8000-000000000028',
     '00000000-0000-4000-9000-000000000007', 'assigned'),
    ('00000000-0000-4000-a000-000000000062',
     '00000000-0000-4000-8000-000000000029',
     '00000000-0000-4000-9000-000000000007', 'assigned');
-- volunteer11 (…02a) und volunteer12 (…02b) bleiben ungebunden.

-- ============================================================
-- SCHRITT 7 — Personal-Anfragen (Requests)
-- ============================================================
-- Gemischter Status, damit die OutstandingRequests-Liste im PM-Dashboard
-- und der eigene Log im Team-Lead-View beide sinnvolle Daten haben.

INSERT INTO requests (team_id, zone, people_needed, shift_start, shift_end, skills, notes, status) VALUES
    ('00000000-0000-4000-9000-000000000001', 'Stage A',
     2, (CURRENT_DATE + time '17:00'), (CURRENT_DATE + time '19:00'),
     'Routing, Cableman', '[DEMO] Sound-Check braucht dringend zwei extra Hands.',
     'open'),
    ('00000000-0000-4000-9000-000000000005', 'Backstage',
     1, (CURRENT_DATE + time '10:00'), (CURRENT_DATE + time '13:00'),
     NULL, '[DEMO] Eine Person zur Verstaerkung im Green Room.',
     'partial'),
    ('00000000-0000-4000-9000-000000000006', 'AV/Tech',
     1, (CURRENT_DATE + time '09:00'), (CURRENT_DATE + time '12:00'),
     'Videotechnik', '[DEMO] Kameraführung — gern mit Broadcast-Erfahrung.',
     'filled'),
    ('00000000-0000-4000-9000-000000000003', 'Catering',
     3, (CURRENT_DATE + time '11:30'), (CURRENT_DATE + time '14:00'),
     'Food-Safety-Know-how', '[DEMO] Mittagsrush — drei Extras an die Stationen.',
     'open'),
    ('00000000-0000-4000-9000-000000000007', 'Main Hall',
     2, (CURRENT_DATE + time '13:30'), (CURRENT_DATE + time '15:00'),
     NULL, '[DEMO] Teppich bis um 13:30 nicht fertig, wir brauchen Nachschub.',
     'open');

-- ============================================================
-- SCHRITT 8 — Notifications (PM → Leads)
-- ============================================================
-- Mix aus Broadcasts (to_role='lead') und Direktnachrichten (to_user_id).

INSERT INTO notifications (from_user_id, to_role, to_user_id, message, is_read) VALUES
    ('00000000-0000-4000-8000-000000000002', 'lead', NULL,
     '[DEMO] Kickoff-Meeting heute 16:00 im Buero. Kurz und knapp.',
     false),
    ('00000000-0000-4000-8000-000000000003', NULL,
     '00000000-0000-4000-8000-000000000010',
     '[DEMO] Stage A — zwei Personen noch fuer 17:00 gesucht.',
     false),
    ('00000000-0000-4000-8000-000000000002', NULL,
     '00000000-0000-4000-8000-000000000012',
     '[DEMO] Danke fuer den reibungslosen Fruehservice!',
     true),
    ('00000000-0000-4000-8000-000000000003', 'lead', NULL,
     '[DEMO] Wetterwarnung ab 18:00 — Equipment drinnen lagern.',
     false),
    ('00000000-0000-4000-8000-000000000002', NULL,
     '00000000-0000-4000-8000-000000000014',
     '[DEMO] Kuenstler X kommt 30min frueher. Bitte Backstage vorbereiten.',
     true);

-- ============================================================
-- SCHRITT 9 — Forecasts (ML-Prognose pro Zone × 2h-Slot)
-- ============================================================
-- Sieben Zonen × acht 2h-Slots (07:00 bis 21:00) = 56 Rows.
-- Zahlen sind Fantasie-Werte, damit der Chart im PM-Dashboard etwas
-- anzeigt. Kurve: vormittags ansteigend, Peak ab 13:00, Abend ruhiger.

INSERT INTO forecasts (zone, shift_slot, predicted_count) VALUES
    -- Stage A
    ('Stage A', '07:00', 2), ('Stage A', '09:00', 4),
    ('Stage A', '11:00', 5), ('Stage A', '13:00', 6),
    ('Stage A', '15:00', 6), ('Stage A', '17:00', 8),
    ('Stage A', '19:00', 5), ('Stage A', '21:00', 2),
    -- Stage B
    ('Stage B', '07:00', 3), ('Stage B', '09:00', 5),
    ('Stage B', '11:00', 6), ('Stage B', '13:00', 7),
    ('Stage B', '15:00', 7), ('Stage B', '17:00', 6),
    ('Stage B', '19:00', 4), ('Stage B', '21:00', 2),
    -- Catering
    ('Catering', '07:00', 5), ('Catering', '09:00', 4),
    ('Catering', '11:00', 8), ('Catering', '13:00', 8),
    ('Catering', '15:00', 3), ('Catering', '17:00', 5),
    ('Catering', '19:00', 6), ('Catering', '21:00', 3),
    -- Entrance
    ('Entrance', '07:00', 2), ('Entrance', '09:00', 5),
    ('Entrance', '11:00', 4), ('Entrance', '13:00', 3),
    ('Entrance', '15:00', 3), ('Entrance', '17:00', 4),
    ('Entrance', '19:00', 3), ('Entrance', '21:00', 2),
    -- Backstage
    ('Backstage', '07:00', 1), ('Backstage', '09:00', 2),
    ('Backstage', '11:00', 3), ('Backstage', '13:00', 4),
    ('Backstage', '15:00', 4), ('Backstage', '17:00', 5),
    ('Backstage', '19:00', 4), ('Backstage', '21:00', 2),
    -- AV/Tech
    ('AV/Tech', '07:00', 2), ('AV/Tech', '09:00', 4),
    ('AV/Tech', '11:00', 5), ('AV/Tech', '13:00', 6),
    ('AV/Tech', '15:00', 6), ('AV/Tech', '17:00', 7),
    ('AV/Tech', '19:00', 5), ('AV/Tech', '21:00', 2),
    -- Main Hall
    ('Main Hall', '07:00', 3), ('Main Hall', '09:00', 6),
    ('Main Hall', '11:00', 8), ('Main Hall', '13:00', 9),
    ('Main Hall', '15:00', 7), ('Main Hall', '17:00', 10),
    ('Main Hall', '19:00', 6), ('Main Hall', '21:00', 3);

-- ============================================================
-- SCHRITT 10 — Config (Venue-Map-Platzhalter)
-- ============================================================
-- Schreiben wir NICHT vor: Admin-Seite soll bewusst "noch keine Karte"
-- anzeigen, damit der Upload-Flow getestet werden kann. Falls die
-- Zeile aus früheren Runs steht, lassen wir sie in Ruhe.

-- ============================================================
-- SCHRITT 11 — Seed-Helper-Funktion entfernen
-- ============================================================
DROP FUNCTION IF EXISTS public.seed_create_user(
    UUID, TEXT, TEXT, TEXT, TEXT, TEXT
);

COMMIT;

-- ============================================================
-- LOGIN-HINWEISE
-- ============================================================
-- Alle Demo-Accounts haben Passwort:  StartCrew123!
--
-- Rolle     | Email                            | Name
-- ----------|----------------------------------|---------------
-- Admin     | admin@startcrew.test             | Ada Admin
-- PM        | pm.aier@startcrew.test           | Stefan Aier
-- PM        | pm.mayer@startcrew.test          | Clara Mayer
-- Lead (A)  | lead.stagea@startcrew.test       | Luca Hoffmann
-- Lead (B)  | lead.stageb@startcrew.test       | Maya Keller
-- Lead (C)  | lead.catering@startcrew.test     | Jonas Weber
-- Lead (E)  | lead.entrance@startcrew.test     | Sara Frei
-- Lead (BS) | lead.backstage@startcrew.test    | Tim Brunner
-- Lead (AV) | lead.av@startcrew.test           | Emma Mueller
-- Lead (MH) | lead.mainhall@startcrew.test     | Noah Bucher
-- Volunteer | volunteer01@startcrew.test..     | Leon Roth (+11 weitere)
--
-- volunteer11 und volunteer12 sind bewusst OHNE Team und OHNE aktiven
-- Task — perfekt zum Testen des "Übernehmen"-Buttons.
