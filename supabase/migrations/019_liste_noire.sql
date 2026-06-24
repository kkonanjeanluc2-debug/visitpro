-- Migration 019 : Liste noire & visiteurs indésirables

CREATE TABLE IF NOT EXISTS liste_noire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  organisation TEXT,
  motif TEXT NOT NULL,
  signale_par UUID NOT NULL REFERENCES utilisateurs(id),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE liste_noire ENABLE ROW LEVEL SECURITY;

-- Lecture : admin, patron et secrétaire peuvent lire
CREATE POLICY "liste_noire_select" ON liste_noire
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = liste_noire.entreprise_id
        AND u.role IN ('admin', 'patron', 'secretaire')
        AND u.actif = true
    )
  );

-- Insertion : admin et patron uniquement
CREATE POLICY "liste_noire_insert" ON liste_noire
  FOR INSERT WITH CHECK (
    signale_par = auth.uid() AND
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = liste_noire.entreprise_id
        AND u.role IN ('admin', 'patron')
        AND u.actif = true
    )
  );

-- Mise à jour : admin et patron (pour activer/désactiver)
CREATE POLICY "liste_noire_update" ON liste_noire
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = liste_noire.entreprise_id
        AND u.role IN ('admin', 'patron')
        AND u.actif = true
    )
  );

-- Index pour la vérification rapide lors de l'enregistrement d'une visite
CREATE INDEX IF NOT EXISTS idx_liste_noire_entreprise_actif ON liste_noire(entreprise_id, actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_liste_noire_telephone ON liste_noire(entreprise_id, telephone) WHERE telephone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_liste_noire_nom ON liste_noire(entreprise_id, nom, prenom);

COMMENT ON TABLE liste_noire IS 'Visiteurs indésirables — vérification automatique à l''enregistrement d''une visite';
