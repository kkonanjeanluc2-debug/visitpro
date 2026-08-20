-- Colonnes signatures sur comptes_rendus
ALTER TABLE comptes_rendus
  ADD COLUMN IF NOT EXISTS signature_secretaire    TEXT,
  ADD COLUMN IF NOT EXISTS signature_president     TEXT,
  ADD COLUMN IF NOT EXISTS approuve_par_president_le TIMESTAMPTZ;
