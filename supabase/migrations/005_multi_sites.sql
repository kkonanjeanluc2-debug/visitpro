-- Migration 005 : Multi-sites

-- ── Table sites ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE CASCADE NOT NULL,
  nom           text NOT NULL,
  adresse       text,
  telephone     text,
  responsable_id uuid REFERENCES utilisateurs(id),
  actif         boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ── Colonnes site_id sur tables existantes ─────────────────────────────────
ALTER TABLE utilisateurs  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id);
ALTER TABLE visites        ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id);
ALTER TABLE rendez_vous    ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id);

-- ── Site par défaut "Siège Social" pour chaque entreprise ─────────────────
INSERT INTO sites (entreprise_id, nom, adresse, telephone)
SELECT id, 'Siège Social', adresse, telephone
FROM entreprises
ON CONFLICT DO NOTHING;

-- Assigner le site par défaut aux utilisateurs existants
UPDATE utilisateurs u
SET site_id = s.id
FROM sites s
WHERE s.entreprise_id = u.entreprise_id
  AND u.site_id IS NULL;

-- Assigner le site par défaut aux visites existantes
UPDATE visites v
SET site_id = s.id
FROM sites s
WHERE s.entreprise_id = v.entreprise_id
  AND v.site_id IS NULL;

-- Assigner le site par défaut aux rendez-vous existants
UPDATE rendez_vous r
SET site_id = s.id
FROM sites s
WHERE s.entreprise_id = r.entreprise_id
  AND r.site_id IS NULL;

-- ── Fonction helper ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_site_id()
RETURNS uuid AS $$
  SELECT site_id FROM utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── RLS pour sites ─────────────────────────────────────────────────────────
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_select" ON sites
  FOR SELECT USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "sites_insert" ON sites
  FOR INSERT WITH CHECK (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('admin', 'patron')
  );

CREATE POLICY "sites_update" ON sites
  FOR UPDATE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('admin', 'patron')
  );

CREATE POLICY "sites_delete" ON sites
  FOR DELETE USING (
    entreprise_id = get_user_entreprise_id() AND
    get_user_role() IN ('admin', 'patron')
  );

-- ── Realtime ───────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE sites;
ALTER TABLE sites REPLICA IDENTITY FULL;

-- ── Index ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_entreprise    ON sites(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_site   ON utilisateurs(site_id);
CREATE INDEX IF NOT EXISTS idx_visites_site        ON visites(site_id);
CREATE INDEX IF NOT EXISTS idx_rdv_site            ON rendez_vous(site_id);
