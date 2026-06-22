-- Migration 007 : Correction récursion infinie dans les politiques RLS super admin
--
-- Problème : la politique "super_admin_utilisateurs_select" sur la table utilisateurs
-- contient un sous-SELECT sur utilisateurs lui-même → récursion infinie → toutes les
-- connexions échouent avec "Profil utilisateur introuvable".
--
-- Solution : créer une fonction SECURITY DEFINER qui contourne le RLS pour lire
-- is_super_admin, puis réécrire toutes les politiques super admin avec cette fonction.

-- ── 1. Fonction helper SECURITY DEFINER ───────────────────────────────────────
-- SECURITY DEFINER = s'exécute avec les droits du créateur (bypass RLS)
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM utilisateurs WHERE id = auth.uid()),
    false
  )
$$;

-- ── 2. Supprimer les anciennes politiques récursives ──────────────────────────
DROP POLICY IF EXISTS "super_admin_entreprises_select" ON entreprises;
DROP POLICY IF EXISTS "super_admin_entreprises_update" ON entreprises;
DROP POLICY IF EXISTS "super_admin_utilisateurs_select" ON utilisateurs;
DROP POLICY IF EXISTS "super_admin_abonnements_all" ON abonnements;
DROP POLICY IF EXISTS "super_admin_visites_select" ON visites;
DROP POLICY IF EXISTS "super_admin_rdv_select" ON rendez_vous;

-- ── 3. Recréer les politiques avec la fonction helper ─────────────────────────

-- Entreprises
CREATE POLICY "super_admin_entreprises_select" ON entreprises
  FOR SELECT USING (is_current_user_super_admin());

CREATE POLICY "super_admin_entreprises_update" ON entreprises
  FOR UPDATE USING (is_current_user_super_admin());

-- Utilisateurs (plus de récursion car la fonction bypasse le RLS)
CREATE POLICY "super_admin_utilisateurs_select" ON utilisateurs
  FOR SELECT USING (is_current_user_super_admin());

-- Abonnements
CREATE POLICY "super_admin_abonnements_all" ON abonnements
  FOR ALL USING (is_current_user_super_admin());

-- Visites
CREATE POLICY "super_admin_visites_select" ON visites
  FOR SELECT USING (is_current_user_super_admin());

-- Rendez-vous
CREATE POLICY "super_admin_rdv_select" ON rendez_vous
  FOR SELECT USING (is_current_user_super_admin());
