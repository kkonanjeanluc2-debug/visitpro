-- Migration 012 : Maileroo + WhatsApp simple (liens wa.me)

-- ─── Supprimer les colonnes Meta WhatsApp (plus utilisées)
ALTER TABLE entreprises
  DROP COLUMN IF EXISTS whatsapp_phone_id,
  DROP COLUMN IF EXISTS whatsapp_access_token,
  DROP COLUMN IF EXISTS whatsapp_template_rdv;

-- ─── Ajouter la config Maileroo et canal de notification
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS canal_notif text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS maileroo_api_key text,
  ADD COLUMN IF NOT EXISTS email_expediteur text DEFAULT 'noreply@visitpro.ci',
  ADD COLUMN IF NOT EXISTS nom_expediteur text DEFAULT 'VisitPro';

-- ─── Mettre à jour les valeurs canal_notif existantes
UPDATE entreprises SET canal_notif = 'whatsapp_simple' WHERE canal_notif = 'whatsapp';
UPDATE entreprises SET canal_notif = 'email_et_whatsapp' WHERE canal_notif = 'les_deux';

-- ─── Table de traçabilité des notifications envoyées
CREATE TABLE IF NOT EXISTS notifications_envoyees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id    uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  visite_id        uuid REFERENCES visites(id) ON DELETE SET NULL,
  rdv_id           uuid REFERENCES rendez_vous(id) ON DELETE SET NULL,
  canal            text NOT NULL,                -- 'email' | 'whatsapp'
  destinataire     text NOT NULL,                -- email ou numéro de téléphone
  type_notif       text NOT NULL,                -- 'confirmation_rdv' | 'rappel_rdv' | ...
  statut           text NOT NULL DEFAULT 'en_attente', -- 'envoye' | 'echec' | 'lien_genere'
  message_id       text,                         -- ID retourné par Maileroo
  erreur           text,                         -- Message d'erreur si échec
  lien_whatsapp    text,                         -- Lien wa.me généré
  whatsapp_clique  boolean DEFAULT false,        -- True si la secrétaire a cliqué le lien
  created_at       timestamptz DEFAULT now()
);

-- ─── Index pour les requêtes de traçabilité
CREATE INDEX IF NOT EXISTS idx_notif_envoyees_entreprise
  ON notifications_envoyees(entreprise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_envoyees_visite
  ON notifications_envoyees(visite_id) WHERE visite_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_envoyees_rdv
  ON notifications_envoyees(rdv_id) WHERE rdv_id IS NOT NULL;

-- ─── RLS
ALTER TABLE notifications_envoyees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_envoyees_select" ON notifications_envoyees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = notifications_envoyees.entreprise_id
        AND u.role IN ('admin', 'patron')
    )
  );

-- Le service role peut insérer librement
CREATE POLICY "notif_envoyees_insert" ON notifications_envoyees
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notif_envoyees_update_clic" ON notifications_envoyees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE u.id = auth.uid()
        AND u.entreprise_id = notifications_envoyees.entreprise_id
    )
  );
