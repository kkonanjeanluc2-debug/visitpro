-- Table des tarifs configurables par le super-admin
CREATE TABLE IF NOT EXISTS tarifs_plans (
  plan         TEXT PRIMARY KEY,
  prix_mensuel INTEGER NOT NULL DEFAULT 0,
  prix_annuel  INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Valeurs initiales
INSERT INTO tarifs_plans (plan, prix_mensuel, prix_annuel) VALUES
  ('pro',        20000, 200000),
  ('enterprise', 45000, 450000)
ON CONFLICT (plan) DO NOTHING;

-- RLS
ALTER TABLE tarifs_plans ENABLE ROW LEVEL SECURITY;

-- Lecture publique (landing page, AbonnementSection)
CREATE POLICY "tarifs_read_all" ON tarifs_plans
  FOR SELECT USING (true);

-- Écriture réservée aux super-admins
CREATE POLICY "tarifs_superadmin_write" ON tarifs_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs
      WHERE utilisateurs.id = auth.uid()
        AND utilisateurs.is_super_admin = true
    )
  );
