-- ════════════════════════════════════════════════════════════════════════════
-- 038 — Sécurité : supprimer l'insertion libre dans utilisateurs
-- ════════════════════════════════════════════════════════════════════════════
-- Les politiques "utilisateurs_insert" (002) et "Création compte (register)" (001)
-- autorisaient WITH CHECK (true) : n'importe quel client avec la clé anon pouvait
-- créer une ligne utilisateurs avec le rôle et l'entreprise de son choix.
--
-- Toutes les créations de compte passent par le service role, qui ignore la RLS :
--   /api/register, /api/auth/invite, /api/appsumo/activer
-- Aucune politique INSERT n'est donc nécessaire.

DROP POLICY IF EXISTS "utilisateurs_insert" ON utilisateurs;
DROP POLICY IF EXISTS "Création compte (register)" ON utilisateurs;
