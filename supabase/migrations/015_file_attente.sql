-- Migration 015 : File d'attente intelligente

ALTER TABLE visites
  ADD COLUMN IF NOT EXISTS ordre_file INTEGER,
  ADD COLUMN IF NOT EXISTS temps_attente_estime INTEGER; -- en minutes

-- Fonction : recalculer l'ordre et les temps estimés pour les visites en attente
CREATE OR REPLACE FUNCTION recalculer_file_attente(entreprise_id_param UUID)
RETURNS void AS $$
DECLARE
  visite RECORD;
  position INTEGER := 1;
  temps_moyen INTEGER := 15; -- 15 min par défaut par visite
BEGIN
  FOR visite IN
    SELECT id FROM visites
    WHERE entreprise_id = entreprise_id_param
      AND statut = 'en_attente'
      AND DATE(heure_arrivee) = CURRENT_DATE
    ORDER BY
      CASE niveau_urgence WHEN 'vip' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
      ordre_file NULLS LAST,
      heure_arrivee
  LOOP
    UPDATE visites
    SET ordre_file = position,
        temps_attente_estime = (position - 1) * temps_moyen
    WHERE id = visite.id;
    position := position + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour les requêtes de file d'attente
CREATE INDEX IF NOT EXISTS idx_visites_file_attente
  ON visites(entreprise_id, statut, ordre_file, heure_arrivee)
  WHERE statut = 'en_attente';

COMMENT ON COLUMN visites.ordre_file IS 'Position dans la file d''attente du jour (recalculée automatiquement)';
COMMENT ON COLUMN visites.temps_attente_estime IS 'Temps d''attente estimé en minutes';

-- Mettre à jour la vue display_visites pour inclure les nouvelles colonnes
-- CREATE OR REPLACE ne peut pas changer l'ordre des colonnes → DROP + CREATE
DROP VIEW IF EXISTS display_visites;
CREATE VIEW display_visites AS
SELECT
  v.id,
  v.nom_visiteur,
  v.prenom_visiteur,
  v.organisation_visiteur,
  v.statut,
  v.niveau_urgence,
  v.heure_arrivee,
  v.ordre_file,
  v.temps_attente_estime,
  v.entreprise_id,
  u.prenom AS destinataire_prenom,
  u.nom AS destinataire_nom,
  u.poste AS destinataire_poste
FROM visites v
LEFT JOIN utilisateurs u ON u.id = v.destinataire_id
WHERE v.statut IN ('en_attente', 'acceptee', 'en_cours')
  AND DATE(v.heure_arrivee) = CURRENT_DATE;
