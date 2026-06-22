-- Migration 006 : Espace Super Admin

-- ── Colonne is_super_admin sur utilisateurs ────────────────────────────────
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- ── Enrichissement de la table abonnements ────────────────────────────────
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS essai_jours integer DEFAULT 0;
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS date_fin_essai timestamptz;
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS attribue_par uuid REFERENCES utilisateurs(id);
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS duree_mois integer;

-- Étendre le check sur statut pour inclure 'essai'
ALTER TABLE abonnements DROP CONSTRAINT IF EXISTS abonnements_statut_check;
ALTER TABLE abonnements ADD CONSTRAINT abonnements_statut_check
  CHECK (statut IN ('actif', 'expire', 'suspendu', 'essai'));

-- ── Désigner l'utilisateur patron actuel comme super admin ─────────────────
UPDATE utilisateurs
SET is_super_admin = true
WHERE id = (
  SELECT u.id FROM utilisateurs u
  JOIN auth.users au ON au.id = u.id
  WHERE au.email = 'kkonanjeanluc2@gmail.com'
  LIMIT 1
);

-- ── RLS supplémentaires : super admin voit tout ────────────────────────────
-- Entreprises : super admin peut tout lire et modifier
CREATE POLICY "super_admin_entreprises_select" ON entreprises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "super_admin_entreprises_update" ON entreprises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Utilisateurs : super admin peut tout lire
CREATE POLICY "super_admin_utilisateurs_select" ON utilisateurs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Abonnements : super admin peut tout gérer
CREATE POLICY "super_admin_abonnements_all" ON abonnements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Visites : super admin peut tout lire
CREATE POLICY "super_admin_visites_select" ON visites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "super_admin_rdv_select" ON rendez_vous
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ── Index ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_utilisateurs_super_admin ON utilisateurs(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX IF NOT EXISTS idx_abonnements_statut ON abonnements(statut, date_fin);
CREATE INDEX IF NOT EXISTS idx_abonnements_plan ON abonnements(plan, statut);
