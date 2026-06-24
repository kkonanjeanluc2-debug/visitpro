-- Migration 025 : Messagerie interne — script consolidé (017 + 021)
-- À appliquer dans Supabase SQL Editor si les tables ne sont pas encore créées.
-- Toutes les instructions sont idempotentes (IF NOT EXISTS / DROP IF EXISTS).

-- 1. Créer la table principale
CREATE TABLE IF NOT EXISTS messages_visite (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visite_id      UUID        NOT NULL REFERENCES visites(id)      ON DELETE CASCADE,
  entreprise_id  UUID        NOT NULL REFERENCES entreprises(id)  ON DELETE CASCADE,
  auteur_id      UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  corps          TEXT        NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ajouter les colonnes destinataire / lecture (migration 021)
ALTER TABLE messages_visite
  ADD COLUMN IF NOT EXISTS destinataire_id UUID REFERENCES utilisateurs(id),
  ADD COLUMN IF NOT EXISTS lu              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lu_at          TIMESTAMPTZ;

-- 3. Activer RLS
ALTER TABLE messages_visite ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer toutes les anciennes policies (noms possibles)
DROP POLICY IF EXISTS "messages_select"             ON messages_visite;
DROP POLICY IF EXISTS "messages_insert"             ON messages_visite;
DROP POLICY IF EXISTS "messages_update"             ON messages_visite;
DROP POLICY IF EXISTS "messages_visite_select"      ON messages_visite;
DROP POLICY IF EXISTS "messages_visite_insert"      ON messages_visite;
DROP POLICY IF EXISTS "messages_visite_update"      ON messages_visite;
DROP POLICY IF EXISTS "Utilisateurs de l'entreprise peuvent lire les messages" ON messages_visite;
DROP POLICY IF EXISTS "Utilisateurs peuvent envoyer des messages"              ON messages_visite;
DROP POLICY IF EXISTS "Destinataire peut marquer comme lu"                    ON messages_visite;

-- 5. Recréer les policies proprement
-- Lecture : tout membre de la même entreprise
CREATE POLICY "messages_visite_select" ON messages_visite
  FOR SELECT USING (
    entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())
  );

-- Insertion : auteur authentifié, dans sa propre entreprise
CREATE POLICY "messages_visite_insert" ON messages_visite
  FOR INSERT WITH CHECK (
    auteur_id = auth.uid()
    AND entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())
  );

-- Mise à jour : seul le destinataire peut marquer comme lu
CREATE POLICY "messages_visite_update" ON messages_visite
  FOR UPDATE USING  (destinataire_id = auth.uid())
  WITH CHECK        (destinataire_id = auth.uid());

-- 6. Index de performance
CREATE INDEX IF NOT EXISTS idx_messages_visite
  ON messages_visite(visite_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_entreprise
  ON messages_visite(entreprise_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_visite_destinataire_lu
  ON messages_visite(destinataire_id, lu)
  WHERE NOT lu;

-- 7. Activer Realtime sur la table
ALTER PUBLICATION supabase_realtime ADD TABLE messages_visite;

COMMENT ON TABLE messages_visite IS 'Messagerie interne liée à une visite — secrétaire ↔ collaborateur';
