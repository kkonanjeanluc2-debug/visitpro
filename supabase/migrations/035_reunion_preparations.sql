CREATE TABLE IF NOT EXISTS reunion_preparations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id  uuid        NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  point_id    uuid        REFERENCES reunion_points(id) ON DELETE SET NULL,
  auteur_id   uuid        NOT NULL REFERENCES utilisateurs(id),
  type        TEXT        NOT NULL DEFAULT 'note'
                          CHECK (type IN ('document', 'note', 'action', 'question')),
  titre       TEXT        NOT NULL,
  contenu     TEXT,
  statut      TEXT        NOT NULL DEFAULT 'en_cours'
                          CHECK (statut IN ('en_cours', 'pret', 'valide')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preparations_reunion ON reunion_preparations(reunion_id);
CREATE INDEX IF NOT EXISTS idx_preparations_point   ON reunion_preparations(point_id);
CREATE INDEX IF NOT EXISTS idx_preparations_auteur  ON reunion_preparations(auteur_id);
