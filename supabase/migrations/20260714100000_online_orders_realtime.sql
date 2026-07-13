-- ================================================================
-- ONLINE STORE REALTIME: Live order synchronization for shopkeepers
-- ================================================================

-- Full row data for filtered realtime subscriptions on store_id
ALTER TABLE public.online_orders REPLICA IDENTITY FULL;

-- Idempotent: ensure table is in the realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'online_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.online_orders;
    END IF;
END $$;
