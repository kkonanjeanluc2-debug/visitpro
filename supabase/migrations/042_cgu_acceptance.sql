-- Suivi de l'acceptation des CGU par chaque utilisateur
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS cgu_acceptees_le  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cgu_version       TEXT DEFAULT '1.0';

COMMENT ON COLUMN utilisateurs.cgu_acceptees_le IS
  'Date et heure d''acceptation des CGU/Politique de confidentialité';
COMMENT ON COLUMN utilisateurs.cgu_version IS
  'Version des CGU acceptées au moment de l''inscription';
