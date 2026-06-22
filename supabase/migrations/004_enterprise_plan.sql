-- Migration 004 : Mise à jour du plan Enterprise
-- Applique le plan enterprise à toutes les entreprises existantes

UPDATE entreprises
SET plan = 'enterprise';

-- Créer ou mettre à jour l'abonnement actif
INSERT INTO abonnements (entreprise_id, plan, statut, date_debut, montant)
SELECT id, 'enterprise', 'actif', now(), 40000
FROM entreprises
ON CONFLICT DO NOTHING;

-- Mettre à jour les abonnements existants
UPDATE abonnements
SET plan = 'enterprise',
    statut = 'actif',
    montant = 40000,
    date_fin = null
WHERE statut = 'actif';
