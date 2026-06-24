-- Migration 018 : Rapports hebdomadaires automatiques

CREATE TABLE IF NOT EXISTS rapports_envoyes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  nb_visites INTEGER NOT NULL DEFAULT 0,
  nb_acceptees INTEGER NOT NULL DEFAULT 0,
  nb_declinee INTEGER NOT NULL DEFAULT 0,
  temps_attente_moyen INTEGER, -- en minutes
  envoye_a TEXT[] NOT NULL DEFAULT '{}', -- liste d'emails
  envoye_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_rapports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID UNIQUE NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  actif BOOLEAN DEFAULT true,
  emails_destinataires TEXT[] NOT NULL DEFAULT '{}',
  jour_envoi INTEGER DEFAULT 1 CHECK (jour_envoi BETWEEN 0 AND 6), -- 0=dim, 1=lun
  heure_envoi TEXT DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE rapports_envoyes ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_rapports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rapports_select" ON rapports_envoyes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = rapports_envoyes.entreprise_id
        AND u.role IN ('admin', 'patron')
        AND u.actif = true
    )
  );

CREATE POLICY "rapports_service_insert" ON rapports_envoyes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "config_rapports_select" ON config_rapports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = config_rapports.entreprise_id
        AND u.role IN ('admin', 'patron')
        AND u.actif = true
    )
  );

CREATE POLICY "config_rapports_upsert" ON config_rapports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = config_rapports.entreprise_id
        AND u.role IN ('admin', 'patron')
        AND u.actif = true
    )
  );

COMMENT ON TABLE rapports_envoyes IS 'Historique des rapports hebdomadaires envoyés par email';
COMMENT ON TABLE config_rapports IS 'Configuration des rapports automatiques par entreprise';
