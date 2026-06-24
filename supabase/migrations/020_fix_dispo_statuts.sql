-- Migration 020 : Correction des valeurs de statut_dispo
-- Les valeurs du spec sont : disponible | en_reunion | ne_pas_deranger | absent
-- (remplacement de occupe et pause par les noms corrects)

-- 1. Supprimer le CHECK constraint existant
ALTER TABLE utilisateurs
  DROP CONSTRAINT IF EXISTS utilisateurs_statut_dispo_check;

-- 2. Migrer les données existantes
UPDATE utilisateurs SET statut_dispo = 'en_reunion'     WHERE statut_dispo = 'occupe';
UPDATE utilisateurs SET statut_dispo = 'ne_pas_deranger' WHERE statut_dispo = 'pause';

-- 3. Recréer le CHECK constraint avec les bonnes valeurs
ALTER TABLE utilisateurs
  ADD CONSTRAINT utilisateurs_statut_dispo_check
  CHECK (statut_dispo IN ('disponible', 'en_reunion', 'ne_pas_deranger', 'absent'));

COMMENT ON COLUMN utilisateurs.statut_dispo IS 'disponible | en_reunion | ne_pas_deranger | absent';
