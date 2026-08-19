CREATE TABLE IF NOT EXISTS comptes_rendus (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id      uuid        NOT NULL UNIQUE REFERENCES reunions(id) ON DELETE CASCADE,
  redacteur_id    uuid        NOT NULL REFERENCES utilisateurs(id),
  resume          TEXT,
  decisions       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  plan_actions    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  observations    TEXT,
  statut          TEXT        NOT NULL DEFAULT 'brouillon'
                              CHECK (statut IN ('brouillon', 'finalise')),
  envoye_le       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comptes_rendus_reunion ON comptes_rendus(reunion_id);
CREATE INDEX IF NOT EXISTS idx_comptes_rendus_statut  ON comptes_rendus(statut);
