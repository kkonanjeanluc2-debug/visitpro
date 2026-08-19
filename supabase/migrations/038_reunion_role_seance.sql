-- Ajout du rôle de séance sur les participants d'une réunion
ALTER TABLE reunion_participants
ADD COLUMN IF NOT EXISTS role_seance TEXT CHECK (role_seance IN ('secretaire', 'president'));
