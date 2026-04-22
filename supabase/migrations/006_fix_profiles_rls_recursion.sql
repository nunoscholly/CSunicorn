-- ============================================================
-- Fix: profiles_select verursachte unendliche Rekursion.
-- Die Policy aus 005 prüfte "EXISTS (SELECT 1 FROM profiles ...)"
-- innerhalb einer Policy AUF profiles — PostgreSQL evaluiert
-- RLS-Policies auch für Subqueries, was zur Endlosschleife führte.
--
-- Lösung: SECURITY DEFINER-Funktion, die RLS umgeht.
-- ============================================================

-- Hilfsfunktion: Prüft ob der angemeldete User Admin ist.
-- SECURITY DEFINER läuft als Funktionseigentümer → kein RLS → keine Rekursion.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = check_user_id AND role = 'admin'
    );
$$;

-- Profiles SELECT: Alle sehen aktive Profile + eigenes Profil.
-- Admins sehen zusätzlich deaktivierte Profile (für User-Management).
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        is_active = true
        OR id = auth.uid()
        OR public.is_admin(auth.uid())
    );

-- Profiles UPDATE (Admin): Ebenfalls auf is_admin umstellen,
-- damit auch hier keine Rekursionsgefahr besteht.
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin"
    ON profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Profiles INSERT (Admin): Gleiche Absicherung.
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));
