-- Supabase Realtime with row-level filters (e.g. user_id=eq.xxx) requires
-- REPLICA IDENTITY FULL so the WAL includes all columns, not just the PK.
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE participant_profiles REPLICA IDENTITY FULL;
