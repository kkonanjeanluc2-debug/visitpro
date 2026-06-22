-- Migration 008 : Système de permissions par utilisateur

-- Colonne permissions (JSONB) sur utilisateurs
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';

-- Index pour les requêtes sur les permissions courantes
CREATE INDEX IF NOT EXISTS idx_utilisateurs_permissions ON utilisateurs USING gin(permissions);

-- Commentaire descriptif
COMMENT ON COLUMN utilisateurs.permissions IS
  'Permissions granulaires: voir_stats, gestion_visites, gestion_rdv, export_donnees, responsable_site';
