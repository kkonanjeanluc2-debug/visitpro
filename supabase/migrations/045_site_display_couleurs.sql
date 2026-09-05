-- Migration 045 — Couleurs d'affichage par site
-- Chaque site peut avoir ses propres couleurs pour l'écran d'accueil

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS display_couleur_fond  TEXT DEFAULT '#1E3A5F',
  ADD COLUMN IF NOT EXISTS display_couleur_texte TEXT DEFAULT '#FFFFFF';
