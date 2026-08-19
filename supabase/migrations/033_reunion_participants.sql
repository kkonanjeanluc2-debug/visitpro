CREATE TABLE IF NOT EXISTS reunion_participants (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id          uuid        NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  utilisateur_id      uuid        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  nom_externe         TEXT,
  email_externe       TEXT,
  statut_presence     TEXT        NOT NULL DEFAULT 'invite'
                                  CHECK (statut_presence IN ('invite', 'confirme', 'absent', 'excuse')),
  convocation_envoyee BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT participant_identifie CHECK (utilisateur_id IS NOT NULL OR nom_externe IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_reunion_participants_reunion ON reunion_participants(reunion_id);
CREATE INDEX IF NOT EXISTS idx_reunion_participants_user    ON reunion_participants(utilisateur_id);
