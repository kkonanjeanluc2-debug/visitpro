-- Catalogue des fonctionnalités disponibles
CREATE TABLE IF NOT EXISTS fonctionnalites (
  slug        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  ordre       INTEGER DEFAULT 0
);

-- Fonctionnalités activées par plan
CREATE TABLE IF NOT EXISTS plan_fonctionnalites (
  plan                TEXT NOT NULL,
  fonctionnalite_slug TEXT NOT NULL REFERENCES fonctionnalites(slug) ON DELETE CASCADE,
  actif               BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (plan, fonctionnalite_slug)
);

-- Overrides par entreprise (surcharge le plan)
CREATE TABLE IF NOT EXISTS entreprise_fonctionnalites (
  entreprise_id       UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  fonctionnalite_slug TEXT NOT NULL REFERENCES fonctionnalites(slug) ON DELETE CASCADE,
  actif               BOOLEAN NOT NULL,
  modifie_le          TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (entreprise_id, fonctionnalite_slug)
);

-- Données initiales : catalogue
INSERT INTO fonctionnalites (slug, label, description, ordre) VALUES
  ('reunions',   'Réunions',        'Gestion des réunions, convocations et comptes rendus', 1),
  ('messagerie', 'Messagerie',      'Messagerie interne entre collaborateurs',               2),
  ('rapports',   'Rapports',        'Génération et export de rapports de visite',            3),
  ('display',    'Borne d''accueil','Affichage sur écran d''accueil / borne',                4)
ON CONFLICT (slug) DO NOTHING;

-- Defaults par plan
INSERT INTO plan_fonctionnalites (plan, fonctionnalite_slug, actif) VALUES
  ('starter',    'reunions',   false),
  ('starter',    'messagerie', false),
  ('starter',    'rapports',   true),
  ('starter',    'display',    true),
  ('pro',        'reunions',   true),
  ('pro',        'messagerie', true),
  ('pro',        'rapports',   true),
  ('pro',        'display',    true),
  ('essai',      'reunions',   true),
  ('essai',      'messagerie', true),
  ('essai',      'rapports',   true),
  ('essai',      'display',    true),
  ('enterprise', 'reunions',   true),
  ('enterprise', 'messagerie', true),
  ('enterprise', 'rapports',   true),
  ('enterprise', 'display',    true)
ON CONFLICT (plan, fonctionnalite_slug) DO NOTHING;

-- RLS
ALTER TABLE fonctionnalites ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_fonctionnalites ENABLE ROW LEVEL SECURITY;
ALTER TABLE entreprise_fonctionnalites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_fonctionnalites"
  ON fonctionnalites FOR SELECT TO authenticated USING (true);

CREATE POLICY "lecture_plan_fonctionnalites"
  ON plan_fonctionnalites FOR SELECT TO authenticated USING (true);

CREATE POLICY "lecture_entreprise_fonctionnalites"
  ON entreprise_fonctionnalites FOR SELECT TO authenticated
  USING (
    entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "superadmin_all_fonctionnalites"
  ON fonctionnalites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "superadmin_all_plan_fonctionnalites"
  ON plan_fonctionnalites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "superadmin_all_entreprise_fonctionnalites"
  ON entreprise_fonctionnalites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true));
