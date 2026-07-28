-- Migration 030 — Abonnements push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  entreprise_id  uuid REFERENCES entreprises(id)  ON DELETE CASCADE NOT NULL,
  endpoint       text NOT NULL,
  p256dh         text NOT NULL,
  auth           text NOT NULL,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(utilisateur_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur ne voit que ses propres abonnements
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (utilisateur_id = auth.uid());

-- Le service role peut tout faire (pour l'envoi de push côté serveur)
CREATE POLICY "push_subscriptions_service" ON push_subscriptions
  FOR ALL TO service_role USING (true);
