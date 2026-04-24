-- ============================================================
-- Migration 011 — Demo-Admin-Rolle korrigieren (BUG-1 / BUG-S3)
--
-- Falls der handle_new_user-Trigger die Rolle aus user_metadata nicht
-- korrekt uebernommen hat, wird admin@startcrew.test hier explizit
-- auf role='admin' gesetzt.
-- ============================================================

UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@startcrew.test'
  AND role <> 'admin';
