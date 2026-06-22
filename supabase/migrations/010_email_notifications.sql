-- Migration 010 : Remplacer SMS par email pour les notifications RDV
ALTER TABLE rendez_vous ADD COLUMN IF NOT EXISTS email_envoye boolean DEFAULT false;
