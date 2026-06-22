-- Migration 002 : recréation complète des politiques RLS

-- Helpers (idempotents)
CREATE OR REPLACE FUNCTION get_user_entreprise_id()
RETURNS uuid AS $$
  SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION incrementer_visites(visiteur_id uuid)
RETURNS void AS $$
  UPDATE visiteurs SET nombre_visites = nombre_visites + 1 WHERE id = visiteur_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Suppression de TOUTES les policies existantes
DO $$ DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('entreprises','utilisateurs','visiteurs','visites','rendez_vous','notifications','abonnements')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- ENTREPRISES
-- ============================================================
CREATE POLICY "entreprises_select" ON entreprises
  FOR SELECT USING (id = get_user_entreprise_id());

CREATE POLICY "entreprises_insert" ON entreprises
  FOR INSERT WITH CHECK (true);

CREATE POLICY "entreprises_update" ON entreprises
  FOR UPDATE USING (id = get_user_entreprise_id() AND get_user_role() IN ('admin', 'patron'));

-- ============================================================
-- UTILISATEURS
-- ============================================================
CREATE POLICY "utilisateurs_select" ON utilisateurs
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "utilisateurs_insert" ON utilisateurs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "utilisateurs_update" ON utilisateurs
  FOR UPDATE USING (entreprise_id = get_user_entreprise_id() AND get_user_role() IN ('admin', 'patron'));

CREATE POLICY "utilisateurs_delete" ON utilisateurs
  FOR DELETE USING (entreprise_id = get_user_entreprise_id() AND get_user_role() IN ('admin', 'patron'));

-- ============================================================
-- VISITEURS
-- ============================================================
CREATE POLICY "visiteurs_select" ON visiteurs
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "visiteurs_insert" ON visiteurs
  FOR INSERT WITH CHECK (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "visiteurs_update" ON visiteurs
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "visiteurs_delete" ON visiteurs
  FOR DELETE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('admin', 'patron')
  );

-- ============================================================
-- VISITES
-- ============================================================
CREATE POLICY "visites_select_secretaire" ON visites
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "visites_select_collaborateur" ON visites
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    (destinataire_id = auth.uid() OR get_user_role() IN ('admin', 'patron', 'secretaire'))
  );

CREATE POLICY "visites_insert" ON visites
  FOR INSERT WITH CHECK (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "visites_update" ON visites
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    (destinataire_id = auth.uid() OR get_user_role() IN ('admin', 'patron', 'secretaire'))
  );

-- ============================================================
-- RENDEZ_VOUS
-- ============================================================
CREATE POLICY "rdv_select_all" ON rendez_vous
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    (destinataire_id = auth.uid() OR get_user_role() IN ('secretaire', 'admin', 'patron'))
  );

CREATE POLICY "rdv_insert" ON rendez_vous
  FOR INSERT WITH CHECK (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "rdv_update" ON rendez_vous
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "rdv_delete" ON rendez_vous
  FOR DELETE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (destinataire_id = auth.uid());

CREATE POLICY "notif_insert" ON notifications
  FOR INSERT WITH CHECK (entreprise_id = get_user_entreprise_id());

CREATE POLICY "notif_update" ON notifications
  FOR UPDATE USING (destinataire_id = auth.uid());

-- ============================================================
-- ABONNEMENTS
-- ============================================================
CREATE POLICY "abonnements_select" ON abonnements
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "abonnements_insert" ON abonnements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "abonnements_update" ON abonnements
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('admin', 'patron')
  );
