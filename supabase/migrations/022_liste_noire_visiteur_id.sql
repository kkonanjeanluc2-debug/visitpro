-- Migration 022 : Ajouter visiteur_id à liste_noire pour correspondance exacte

ALTER TABLE liste_noire
  ADD COLUMN IF NOT EXISTS visiteur_id UUID REFERENCES visiteurs(id) ON DELETE SET NULL;

-- Index sur visiteur_id pour les lookups rapides
CREATE INDEX IF NOT EXISTS idx_liste_noire_visiteur
  ON liste_noire(entreprise_id, visiteur_id)
  WHERE visiteur_id IS NOT NULL AND actif = true;
