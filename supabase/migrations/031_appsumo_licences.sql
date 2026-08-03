-- Colonne source sur abonnements (direct, cinetpay, appsumo)
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct';

-- Table des licences AppSumo
CREATE TABLE IF NOT EXISTS appsumo_licences (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appsumo_uuid       TEXT        UNIQUE NOT NULL,
  licence_key        TEXT        UNIQUE NOT NULL,
  plan               TEXT        NOT NULL DEFAULT 'pro'
                                 CHECK (plan IN ('pro', 'enterprise')),
  statut             TEXT        NOT NULL DEFAULT 'non_active'
                                 CHECK (statut IN ('non_active', 'active', 'rembourse', 'suspendu')),
  activation_email   TEXT,
  entreprise_id      uuid        REFERENCES entreprises(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  activated_at       TIMESTAMPTZ,
  historique         JSONB       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_appsumo_statut ON appsumo_licences(statut);

-- RLS : accès réservé au service role (webhook admin)
ALTER TABLE appsumo_licences ENABLE ROW LEVEL SECURITY;
