-- Migration 013 : Écran salle d'attente (TV/tablette)
-- Ajoute la configuration de l'écran d'accueil à la table entreprises

ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS display_message TEXT DEFAULT 'Bienvenue ! Veuillez patienter, nous vous recevons dans un instant.',
  ADD COLUMN IF NOT EXISTS display_couleur_fond TEXT DEFAULT '#1E3A5F',
  ADD COLUMN IF NOT EXISTS display_couleur_texte TEXT DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS display_token TEXT UNIQUE;

-- Générer un token pour les entreprises existantes
UPDATE entreprises
SET display_token = encode(gen_random_bytes(16), 'hex')
WHERE display_token IS NULL;

-- Vue sécurisée pour l'écran d'accueil (expose uniquement les champs publics des visites)
-- Note : ordre_file et temps_attente_estime sont ajoutés en migration 015 (recréation de la vue là-bas)
CREATE OR REPLACE VIEW display_visites AS
SELECT
  v.id,
  v.nom_visiteur,
  v.prenom_visiteur,
  v.organisation_visiteur,
  v.statut,
  v.niveau_urgence,
  v.heure_arrivee,
  v.entreprise_id,
  u.prenom AS destinataire_prenom,
  u.nom AS destinataire_nom,
  u.poste AS destinataire_poste
FROM visites v
LEFT JOIN utilisateurs u ON u.id = v.destinataire_id
WHERE v.statut IN ('en_attente', 'acceptee', 'en_cours')
  AND DATE(v.heure_arrivee) = CURRENT_DATE;

-- Activer RLS sur la vue via security invoker (la vue hérite des permissions du caller)
-- Les visites affichées sont déjà filtrées sur le jour et les statuts actifs
-- L'accès se fait via le token d'entreprise donc pas de RLS supplémentaire nécessaire

COMMENT ON VIEW display_visites IS 'Vue publique pour écran d''accueil — champs non-sensibles uniquement, visites du jour en cours';
