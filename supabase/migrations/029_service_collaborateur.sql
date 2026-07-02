-- Migration 029 — Ajout du champ service aux collaborateurs
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS service TEXT;

COMMENT ON COLUMN utilisateurs.service IS 'Service ou département du collaborateur (ex: Commercial, RH, Comptabilité)';
