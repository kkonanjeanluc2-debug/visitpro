-- Migration 003 : Activer Supabase Realtime pour toutes les tables

-- 1. Ajouter les tables à la publication supabase_realtime
--    Sans ça, postgres_changes ne reçoit AUCUN événement.
ALTER PUBLICATION supabase_realtime ADD TABLE visites;
ALTER PUBLICATION supabase_realtime ADD TABLE visiteurs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE rendez_vous;
ALTER PUBLICATION supabase_realtime ADD TABLE utilisateurs;
ALTER PUBLICATION supabase_realtime ADD TABLE entreprises;
ALTER PUBLICATION supabase_realtime ADD TABLE abonnements;

-- 2. REPLICA IDENTITY FULL : permet les filtres sur colonnes non-PK
--    (ex: filter: `entreprise_id=eq.xxx`) et expose old/new dans les payloads
ALTER TABLE visites        REPLICA IDENTITY FULL;
ALTER TABLE visiteurs      REPLICA IDENTITY FULL;
ALTER TABLE notifications  REPLICA IDENTITY FULL;
ALTER TABLE rendez_vous    REPLICA IDENTITY FULL;
ALTER TABLE utilisateurs   REPLICA IDENTITY FULL;
ALTER TABLE entreprises    REPLICA IDENTITY FULL;
ALTER TABLE abonnements    REPLICA IDENTITY FULL;
