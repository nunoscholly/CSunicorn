-- ============================================================
-- START CREW — Volunteer "Claim Task" RPC
-- Atomare Funktion, die den Race-Condition-Fall aus docs/user_profiles.md
-- (zwei Volunteers klicken zeitgleich auf "Übernehmen") sauber abfängt:
--
--   1. Prüft, dass der Volunteer noch keinen aktiven Task hat
--   2. Dekrementiert slots_remaining — nur wenn noch > 0
--   3. Setzt tasks.status='filled', sobald alle Plätze weg sind
--   4. Schreibt die Assignment-Zeile
--
-- Alles in einer Transaktion. SECURITY DEFINER, damit der RPC die RLS-
-- Checks umgeht (die am Frontend sauber blieben — Volunteer darf nur
-- über diesen RPC committen, nicht direkt auf tasks UPDATE).
--
-- Rückgabe: JSON mit ok-Flag + error-String oder remaining-Zählerstand.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_task_slot(
    p_task_id UUID,
    p_volunteer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing INT;
    v_zone TEXT;
    v_team_id UUID;
    v_updated INT;
    v_remaining INT;
BEGIN
    -- Nur der eigene User darf für sich selbst committen.
    IF p_volunteer_id <> auth.uid() THEN
        RETURN json_build_object('ok', false, 'error', 'forbidden');
    END IF;

    -- One active task per volunteer: harte Regel aus docs/user_profiles.md.
    SELECT COUNT(*) INTO v_existing
        FROM assignments
        WHERE volunteer_id = p_volunteer_id AND status = 'assigned';
    IF v_existing > 0 THEN
        RETURN json_build_object('ok', false, 'error', 'already_assigned');
    END IF;

    -- Zone des Tasks auflösen. Kein Match → Task existiert nicht oder wurde gelöscht.
    SELECT zone INTO v_zone FROM tasks WHERE id = p_task_id;
    IF v_zone IS NULL THEN
        RETURN json_build_object('ok', false, 'error', 'task_not_found');
    END IF;

    -- Team für die Zone suchen. Falls kein Team gepflegt ist, lassen wir das
    -- Assignment trotzdem zu, nur ohne team_id — dann kann der Lead es später
    -- im Roster zuordnen.
    SELECT id INTO v_team_id FROM teams WHERE zone = v_zone LIMIT 1;

    -- Atomic-Decrement: nur dann UPDATE, wenn noch etwas frei ist. Die
    -- CHECK(slots_remaining >= 0)-Constraint ist das zweite Sicherheitsnetz.
    UPDATE tasks
        SET slots_remaining = slots_remaining - 1,
            status = CASE WHEN slots_remaining - 1 = 0 THEN 'filled' ELSE status END
        WHERE id = p_task_id AND slots_remaining > 0;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
        -- Jemand anderes war eine Mikrosekunde schneller.
        RETURN json_build_object('ok', false, 'error', 'taken');
    END IF;

    -- Assignment schreiben. Fehlschlag (z. B. doppelt bei Race) rollt die
    -- Transaktion zurück — dadurch bleibt slots_remaining konsistent.
    INSERT INTO assignments (task_id, volunteer_id, team_id, status)
        VALUES (p_task_id, p_volunteer_id, v_team_id, 'assigned');

    SELECT slots_remaining INTO v_remaining FROM tasks WHERE id = p_task_id;
    RETURN json_build_object('ok', true, 'remaining', v_remaining);
END;
$$;

-- Authenticated dürfen aufrufen — der RPC prüft selbst, dass der aufrufende
-- User auch der angegebene Volunteer ist (auth.uid()-Vergleich oben).
GRANT EXECUTE ON FUNCTION public.claim_task_slot(UUID, UUID) TO authenticated;
