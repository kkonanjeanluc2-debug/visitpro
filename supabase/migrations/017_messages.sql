-- Migration 017 : Messagerie interne secrétaire ↔ collaborateurs

CREATE TABLE IF NOT EXISTS messages_visite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visite_id UUID NOT NULL REFERENCES visites(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  corps TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE messages_visite ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre de l'entreprise peut lire les messages de ses visites
CREATE POLICY "messages_visite_select" ON messages_visite
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = messages_visite.entreprise_id
        AND u.actif = true
    )
  );

-- Insertion : tout membre authentifié de l'entreprise peut envoyer un message
CREATE POLICY "messages_visite_insert" ON messages_visite
  FOR INSERT WITH CHECK (
    auteur_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = messages_visite.entreprise_id
        AND u.actif = true
    )
  );

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_messages_visite ON messages_visite(visite_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_entreprise ON messages_visite(entreprise_id, created_at DESC);

COMMENT ON TABLE messages_visite IS 'Messagerie interne liée à une visite — secrétaire ↔ collaborateur';
