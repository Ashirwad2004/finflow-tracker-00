-- ================================================================
-- STOREFRONT ORDER REALTIME: reliable postgres_changes delivery
-- ================================================================

-- Full row data for filtered realtime subscriptions on order_id
ALTER TABLE public.order_status_events REPLICA IDENTITY FULL;

-- Idempotent: ensure table is in the realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'order_status_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_events;
    END IF;
END $$;

-- Authenticated users (store owners testing their own link) can also receive events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'order_status_events'
          AND policyname = 'Authenticated can view order status events'
    ) THEN
        CREATE POLICY "Authenticated can view order status events"
        ON public.order_status_events FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;
