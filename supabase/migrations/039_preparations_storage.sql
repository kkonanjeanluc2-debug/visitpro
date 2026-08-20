-- Bucket pour les fichiers importés dans les préparations de réunion
INSERT INTO storage.buckets (id, name, public)
VALUES ('preparations', 'preparations', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (les fichiers sont accessibles via URL)
CREATE POLICY "Public read preparations"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'preparations');

-- Upload par les utilisateurs authentifiés
CREATE POLICY "Auth upload preparations"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'preparations');

-- Suppression par les utilisateurs authentifiés
CREATE POLICY "Auth delete preparations"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'preparations');
