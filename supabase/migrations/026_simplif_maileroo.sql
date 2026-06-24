-- Migration 026 : Simplification Maileroo — clé unique côté serveur
-- La clé API Maileroo est désormais uniquement dans .env.local (MAILEROO_API_KEY).
-- Les entreprises ne gèrent plus de compte Maileroo — VisitPro envoie pour elles.

ALTER TABLE entreprises
  DROP COLUMN IF EXISTS maileroo_api_key;

-- email_expediteur et nom_expediteur restent (l'entreprise peut personnaliser
-- le nom affiché : "Cabinet Kouamé via VisitPro").
-- email_expediteur n'est plus éditable par l'entreprise (toujours noreply@visitpro.ci).
