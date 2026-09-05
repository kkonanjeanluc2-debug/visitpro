-- Migration 046 — display_message par site + site_id sur réunions

-- Colonne manquante sur sites (fix spinner page display collaborateur)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS display_message TEXT;

-- site_id sur réunions — permet de filtrer les réunions par site
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id);
CREATE INDEX IF NOT EXISTS idx_reunions_site ON reunions(site_id);
