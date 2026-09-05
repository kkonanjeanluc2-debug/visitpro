-- Migration 044 — Token display par site
-- Chaque site a son propre lien écran d'accueil, distinct du lien global de l'entreprise

ALTER TABLE sites ADD COLUMN IF NOT EXISTS display_token TEXT UNIQUE;

-- Générer un token pour chaque site existant
UPDATE sites
SET display_token = encode(gen_random_bytes(16), 'hex')
WHERE display_token IS NULL;

-- Index pour la recherche par token
CREATE INDEX IF NOT EXISTS idx_sites_display_token ON sites(display_token);
