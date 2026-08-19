-- Table principale des réunions
CREATE TABLE IF NOT EXISTS reunions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id   uuid        NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  titre           TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'interne'
                              CHECK (type IN ('interne', 'externe', 'comite', 'autre')),
  statut          TEXT        NOT NULL DEFAULT 'planifiee'
                              CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'annulee')),
  date_reunion    DATE        NOT NULL,
  heure_debut     TIME        NOT NULL,
  heure_fin       TIME,
  lieu            TEXT,
  organisateur_id uuid        NOT NULL REFERENCES utilisateurs(id),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reunions_entreprise  ON reunions(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_reunions_date        ON reunions(date_reunion);
CREATE INDEX IF NOT EXISTS idx_reunions_organisateur ON reunions(organisateur_id);
CREATE INDEX IF NOT EXISTS idx_reunions_statut      ON reunions(statut);
