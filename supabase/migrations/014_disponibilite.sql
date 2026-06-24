-- Migration 014 : Statut de disponibilité des collaborateurs

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS statut_dispo TEXT DEFAULT 'disponible'
    CHECK (statut_dispo IN ('disponible', 'occupe', 'absent', 'pause')),
  ADD COLUMN IF NOT EXISTS dispo_message TEXT,
  ADD COLUMN IF NOT EXISTS dispo_retour_auto TIMESTAMPTZ;

-- Index pour requêtes de disponibilité fréquentes
CREATE INDEX IF NOT EXISTS idx_utilisateurs_dispo
  ON utilisateurs(entreprise_id, statut_dispo)
  WHERE actif = true;

COMMENT ON COLUMN utilisateurs.statut_dispo IS 'disponible | occupe | absent | pause';
COMMENT ON COLUMN utilisateurs.dispo_message IS 'Message optionnel affiché aux secrétaires';
COMMENT ON COLUMN utilisateurs.dispo_retour_auto IS 'Heure de retour automatique à disponible (NULL = pas de retour auto)';
