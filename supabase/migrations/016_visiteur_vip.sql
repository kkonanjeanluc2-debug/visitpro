-- Migration 016 : Fiche VIP & mémoire visiteur

ALTER TABLE visiteurs
  ADD COLUMN IF NOT EXISTS est_vip BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences TEXT,
  ADD COLUMN IF NOT EXISTS notes_privees TEXT,
  ADD COLUMN IF NOT EXISTS sujets_historique TEXT[]; -- tableau de sujets des visites passées

ALTER TABLE visites
  ADD COLUMN IF NOT EXISTS sujet_traite TEXT; -- résumé du sujet traité lors de la visite

-- Index pour la recherche VIP
CREATE INDEX IF NOT EXISTS idx_visiteurs_vip
  ON visiteurs(entreprise_id, est_vip)
  WHERE est_vip = true;

-- RLS pour notes_privees : seul l'admin/patron peut les voir
-- (implémenté côté application via service role client)

COMMENT ON COLUMN visiteurs.est_vip IS 'Visiteur VIP : accueil prioritaire, mémoire des préférences';
COMMENT ON COLUMN visiteurs.preferences IS 'Préférences / habitudes du visiteur (boisson, mode d''accueil, etc.)';
COMMENT ON COLUMN visiteurs.notes_privees IS 'Notes internes confidentielles sur le visiteur';
COMMENT ON COLUMN visiteurs.sujets_historique IS 'Historique des sujets traités lors des visites passées';
COMMENT ON COLUMN visites.sujet_traite IS 'Résumé du sujet traité lors de cette visite';
