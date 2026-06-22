-- VisitPro - Schéma initial
-- Migration 001

-- Table entreprises
CREATE TABLE IF NOT EXISTS entreprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  secteur text,
  adresse text,
  telephone text,
  email text,
  logo_url text,
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  created_at timestamptz DEFAULT now()
);

-- Table utilisateurs (extension de auth.users)
CREATE TABLE IF NOT EXISTS utilisateurs (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  role text NOT NULL CHECK (role IN ('secretaire', 'collaborateur', 'patron', 'admin')),
  poste text,
  telephone text,
  photo_url text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table visiteurs (répertoire)
CREATE TABLE IF NOT EXISTS visiteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  nom text NOT NULL,
  prenom text,
  organisation text,
  telephone text,
  email text,
  photo_url text,
  nombre_visites integer DEFAULT 0,
  derniere_visite timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table rendez_vous (déclarée avant visites pour la FK)
CREATE TABLE IF NOT EXISTS rendez_vous (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  titre text NOT NULL,
  description text,
  destinataire_id uuid REFERENCES utilisateurs(id) NOT NULL,
  cree_par uuid REFERENCES utilisateurs(id) NOT NULL,
  visiteur_id uuid REFERENCES visiteurs(id),
  nom_visiteur_externe text,
  telephone_visiteur_externe text,
  email_visiteur_externe text,
  organisation_externe text,
  date_rdv date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time,
  statut text DEFAULT 'confirme' CHECK (statut IN ('confirme', 'annule', 'reporte', 'termine')),
  sms_envoye boolean DEFAULT false,
  rappel_envoye boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table visites
CREATE TABLE IF NOT EXISTS visites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  visiteur_id uuid REFERENCES visiteurs(id),
  nom_visiteur text NOT NULL,
  prenom_visiteur text,
  organisation_visiteur text,
  telephone_visiteur text,
  destinataire_id uuid REFERENCES utilisateurs(id) NOT NULL,
  enregistre_par uuid REFERENCES utilisateurs(id) NOT NULL,
  motif text NOT NULL,
  type_visite text DEFAULT 'spontanee' CHECK (type_visite IN ('spontanee', 'rdv', 'livraison', 'autre')),
  rendez_vous_id uuid REFERENCES rendez_vous(id),
  niveau_urgence text DEFAULT 'normal' CHECK (niveau_urgence IN ('normal', 'urgent', 'vip')),
  statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'acceptee', 'en_cours', 'terminee', 'declinee', 'redirigee')),
  decision_par uuid REFERENCES utilisateurs(id),
  decision_at timestamptz,
  note_decision text,
  heure_arrivee timestamptz DEFAULT now(),
  heure_entree timestamptz,
  heure_sortie timestamptz,
  duree_attente integer,
  duree_visite integer,
  badge_imprime boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  destinataire_id uuid REFERENCES utilisateurs(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('nouvelle_visite', 'decision_prise', 'rdv_rappel', 'redirection')),
  visite_id uuid REFERENCES visites(id),
  rdv_id uuid REFERENCES rendez_vous(id),
  titre text NOT NULL,
  corps text,
  lue boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table abonnements
CREATE TABLE IF NOT EXISTS abonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'expire', 'suspendu')),
  date_debut timestamptz DEFAULT now(),
  date_fin timestamptz,
  cinetpay_transaction_id text,
  montant integer,
  created_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_visites_entreprise_statut ON visites(entreprise_id, statut, heure_arrivee DESC);
CREATE INDEX IF NOT EXISTS idx_visites_destinataire ON visites(destinataire_id, statut);
CREATE INDEX IF NOT EXISTS idx_rdv_entreprise_date ON rendez_vous(entreprise_id, date_rdv);
CREATE INDEX IF NOT EXISTS idx_rdv_destinataire_date ON rendez_vous(destinataire_id, date_rdv);
CREATE INDEX IF NOT EXISTS idx_notifications_destinataire ON notifications(destinataire_id, lue);
CREATE INDEX IF NOT EXISTS idx_visiteurs_entreprise ON visiteurs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_entreprise ON utilisateurs(entreprise_id);

-- Activation Row Level Security
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visiteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

-- Fonction pour incrémenter le compteur de visites d'un visiteur
CREATE OR REPLACE FUNCTION incrementer_visites(visiteur_id uuid)
RETURNS void AS $$
  UPDATE visiteurs SET nombre_visites = nombre_visites + 1 WHERE id = visiteur_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Fonction helper : récupérer l'entreprise_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_entreprise_id()
RETURNS uuid AS $$
  SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fonction helper : récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Suppression des policies existantes pour éviter les conflits (idempotent)
DO $$ DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('entreprises','utilisateurs','visiteurs','visites','rendez_vous','notifications','abonnements')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Policies : entreprises
CREATE POLICY "Utilisateurs voient leur entreprise" ON entreprises
  FOR SELECT USING (id = get_user_entreprise_id());

CREATE POLICY "Admin peut modifier l'entreprise" ON entreprises
  FOR UPDATE USING (id = get_user_entreprise_id() AND get_user_role() IN ('admin', 'patron'));

CREATE POLICY "Création entreprise (register)" ON entreprises
  FOR INSERT WITH CHECK (true);

-- Policies : utilisateurs
CREATE POLICY "Utilisateurs de la même entreprise" ON utilisateurs
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "Admin gère les utilisateurs" ON utilisateurs
  FOR ALL USING (entreprise_id = get_user_entreprise_id() AND get_user_role() IN ('admin', 'patron'));

CREATE POLICY "Création compte (register)" ON utilisateurs
  FOR INSERT WITH CHECK (true);

-- Policies : visiteurs
CREATE POLICY "Voir visiteurs de son entreprise" ON visiteurs
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "Secrétaire gère visiteurs" ON visiteurs
  FOR ALL USING (entreprise_id = get_user_entreprise_id() AND get_user_role() IN ('secretaire', 'admin', 'patron'));

-- Policies : visites
CREATE POLICY "Secrétaire voit toutes les visites" ON visites
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "Collaborateur voit ses visites" ON visites
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    destinataire_id = auth.uid() AND
    get_user_role() = 'collaborateur'
  );

CREATE POLICY "Secrétaire crée des visites" ON visites
  FOR INSERT WITH CHECK (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin')
  );

CREATE POLICY "Décision sur les visites" ON visites
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    (destinataire_id = auth.uid() OR get_user_role() IN ('admin', 'patron', 'secretaire'))
  );

-- Policies : rendez_vous
CREATE POLICY "Voir RDV entreprise (secrétaire/patron)" ON rendez_vous
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "Collaborateur voit ses RDV" ON rendez_vous
  FOR SELECT USING (
    entreprise_id = get_user_entreprise_id() AND
    destinataire_id = auth.uid() AND
    get_user_role() = 'collaborateur'
  );

CREATE POLICY "Secrétaire crée RDV" ON rendez_vous
  FOR INSERT WITH CHECK (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

CREATE POLICY "Modifier RDV" ON rendez_vous
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('secretaire', 'admin', 'patron')
  );

-- Policies : notifications
CREATE POLICY "Voir ses notifications" ON notifications
  FOR SELECT USING (destinataire_id = auth.uid());

CREATE POLICY "Marquer notifications lues" ON notifications
  FOR UPDATE USING (destinataire_id = auth.uid());

CREATE POLICY "Système crée notifications" ON notifications
  FOR INSERT WITH CHECK (entreprise_id = get_user_entreprise_id());

-- Policies : abonnements
CREATE POLICY "Voir abonnement entreprise" ON abonnements
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "Admin gère abonnement" ON abonnements
  FOR ALL USING (entreprise_id = get_user_entreprise_id() AND get_user_role() IN ('admin', 'patron'));
