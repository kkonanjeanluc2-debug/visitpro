-- Migration 027 : Couleurs personnalisées par entreprise
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS couleur_primaire TEXT DEFAULT '#1E3A5F',
  ADD COLUMN IF NOT EXISTS couleur_accent   TEXT DEFAULT '#1D9E75';
