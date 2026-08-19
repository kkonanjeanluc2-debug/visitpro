-- Points de l'ordre du jour
CREATE TABLE IF NOT EXISTS reunion_points (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id      uuid        NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  titre           TEXT        NOT NULL,
  description     TEXT,
  responsable_id  uuid        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  duree_estimee   INT,
  ordre           INT         NOT NULL DEFAULT 0,
  statut          TEXT        NOT NULL DEFAULT 'a_traiter'
                              CHECK (statut IN ('a_traiter', 'en_cours', 'traite', 'reporte')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reunion_points_reunion ON reunion_points(reunion_id);
CREATE INDEX IF NOT EXISTS idx_reunion_points_ordre   ON reunion_points(reunion_id, ordre);
