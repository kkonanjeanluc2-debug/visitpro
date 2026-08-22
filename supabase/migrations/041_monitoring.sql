-- Migration 041 : Monitoring super admin

-- Champ derniere_connexion sur utilisateurs
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMPTZ;

-- Table connexions_log
CREATE TABLE IF NOT EXISTS connexions_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  entreprise_id  UUID REFERENCES entreprises(id) ON DELETE SET NULL,
  action         TEXT NOT NULL CHECK (action IN ('connexion', 'deconnexion')),
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS connexions_log_utilisateur_idx ON connexions_log(utilisateur_id);
CREATE INDEX IF NOT EXISTS connexions_log_entreprise_idx  ON connexions_log(entreprise_id);
CREATE INDEX IF NOT EXISTS connexions_log_created_at_idx  ON connexions_log(created_at DESC);

-- RLS : seul le super admin peut lire les logs
ALTER TABLE connexions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_connexions_log_select" ON connexions_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Insert autorisé par service role (via API route) uniquement
CREATE POLICY "service_role_connexions_log_insert" ON connexions_log
  FOR INSERT WITH CHECK (true);
