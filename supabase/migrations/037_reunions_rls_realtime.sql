-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE reunions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comptes_rendus       ENABLE ROW LEVEL SECURITY;

-- reunions
CREATE POLICY "reunions_select" ON reunions FOR SELECT
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

CREATE POLICY "reunions_insert" ON reunions FOR INSERT
  WITH CHECK (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

CREATE POLICY "reunions_update" ON reunions FOR UPDATE
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

CREATE POLICY "reunions_delete" ON reunions FOR DELETE
  USING (
    organisateur_id = auth.uid() OR
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('patron', 'admin'))
  );

-- reunion_participants
CREATE POLICY "rp_select" ON reunion_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_participants.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rp_insert" ON reunion_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_participants.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rp_update" ON reunion_participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_participants.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rp_delete" ON reunion_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_participants.reunion_id AND u.id = auth.uid()
  ));

-- reunion_points
CREATE POLICY "rpoints_select" ON reunion_points FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_points.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rpoints_insert" ON reunion_points FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_points.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rpoints_update" ON reunion_points FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_points.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rpoints_delete" ON reunion_points FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_points.reunion_id AND u.id = auth.uid()
  ));

-- reunion_preparations
CREATE POLICY "rprep_select" ON reunion_preparations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = reunion_preparations.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "rprep_insert" ON reunion_preparations FOR INSERT
  WITH CHECK (auteur_id = auth.uid());

CREATE POLICY "rprep_update" ON reunion_preparations FOR UPDATE
  USING (
    auteur_id = auth.uid() OR
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('patron', 'admin'))
  );

CREATE POLICY "rprep_delete" ON reunion_preparations FOR DELETE
  USING (
    auteur_id = auth.uid() OR
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('patron', 'admin'))
  );

-- comptes_rendus
CREATE POLICY "cr_select" ON comptes_rendus FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reunions r JOIN utilisateurs u ON u.entreprise_id = r.entreprise_id
    WHERE r.id = comptes_rendus.reunion_id AND u.id = auth.uid()
  ));

CREATE POLICY "cr_insert" ON comptes_rendus FOR INSERT
  WITH CHECK (redacteur_id = auth.uid());

CREATE POLICY "cr_update" ON comptes_rendus FOR UPDATE
  USING (
    redacteur_id = auth.uid() OR
    EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('patron', 'admin'))
  );

-- ── REALTIME ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE reunions;
ALTER PUBLICATION supabase_realtime ADD TABLE reunion_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE reunion_preparations;
