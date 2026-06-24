-- Migration 011 : Index supplémentaires pour la scalabilité
-- À appliquer dans Supabase SQL Editor

-- Visites : tri par date d'arrivée (ORDER BY heure_arrivee DESC très fréquent)
CREATE INDEX IF NOT EXISTS idx_visites_entreprise_heure
  ON visites(entreprise_id, heure_arrivee DESC);

-- Visites : filtre par site + tri (secrétaire de site)
CREATE INDEX IF NOT EXISTS idx_visites_site_heure
  ON visites(site_id, heure_arrivee DESC);

-- RDV : filtre courant entreprise + date + statut en une seule passe
CREATE INDEX IF NOT EXISTS idx_rdv_entreprise_date_statut
  ON rendez_vous(entreprise_id, date_rdv, statut);

-- RDV : filtre destinataire + date + statut (agenda collaborateur)
CREATE INDEX IF NOT EXISTS idx_rdv_destinataire_date_statut
  ON rendez_vous(destinataire_id, date_rdv, statut);

-- Notifications : tri par date de création (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_notifications_destinataire_created
  ON notifications(destinataire_id, created_at DESC);

-- Abonnements : recherche du plus récent par entreprise
CREATE INDEX IF NOT EXISTS idx_abonnements_entreprise_created
  ON abonnements(entreprise_id, created_at DESC);

-- Abonnements : lookup par transaction CinetPay (webhook)
CREATE INDEX IF NOT EXISTS idx_abonnements_transaction
  ON abonnements(cinetpay_transaction_id)
  WHERE cinetpay_transaction_id IS NOT NULL;

-- Visiteurs : recherche par nom dans le registre
CREATE INDEX IF NOT EXISTS idx_visiteurs_nom_entreprise
  ON visiteurs(entreprise_id, nom);

-- Utilisateurs : filtre par rôle dans une entreprise (affectation RDV)
CREATE INDEX IF NOT EXISTS idx_utilisateurs_entreprise_role
  ON utilisateurs(entreprise_id, role);
