-- F6 : Messagerie interne — ajouter destinataire_id, lu, lu_at à messages_visite

ALTER TABLE messages_visite
  ADD COLUMN IF NOT EXISTS destinataire_id UUID REFERENCES utilisateurs(id),
  ADD COLUMN IF NOT EXISTS lu BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lu_at TIMESTAMPTZ;

-- Index partiel pour requêtes "non lus par destinataire" (perf)
CREATE INDEX IF NOT EXISTS idx_messages_visite_destinataire_lu
  ON messages_visite(destinataire_id, lu)
  WHERE NOT lu;

-- Activer RLS si pas déjà fait
ALTER TABLE messages_visite ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies (noms possibles selon migration 017)
DROP POLICY IF EXISTS "messages_select" ON messages_visite;
DROP POLICY IF EXISTS "messages_insert" ON messages_visite;
DROP POLICY IF EXISTS "messages_update" ON messages_visite;
DROP POLICY IF EXISTS "Utilisateurs de l'entreprise peuvent lire les messages" ON messages_visite;
DROP POLICY IF EXISTS "Utilisateurs peuvent envoyer des messages" ON messages_visite;
DROP POLICY IF EXISTS "Destinataire peut marquer comme lu" ON messages_visite;
DROP POLICY IF EXISTS "messages_visite_select" ON messages_visite;
DROP POLICY IF EXISTS "messages_visite_insert" ON messages_visite;
DROP POLICY IF EXISTS "messages_visite_update" ON messages_visite;

-- Lecture : membres de la même entreprise
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
  FOR UPDATE USING (
    destinataire_id = auth.uid()
  )
  WITH CHECK (
    destinataire_id = auth.uid()
  );
