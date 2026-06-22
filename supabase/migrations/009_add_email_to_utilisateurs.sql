-- Migration 009 : Ajouter email à la table utilisateurs et backfiller depuis auth.users
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS email text;

-- Backfill email pour les utilisateurs existants
UPDATE utilisateurs u
SET email = au.email
FROM auth.users au
WHERE u.id = au.id AND u.email IS NULL;
