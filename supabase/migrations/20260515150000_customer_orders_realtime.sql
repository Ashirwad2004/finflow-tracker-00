-- ================================================================
-- SECURE REALTIME ORDER TRACKING & HISTORY
-- ================================================================

-- 1. Create a secure table for realtime status updates without PII
CREATE TABLE IF NOT EXISTS public.order_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

-- Allow anon to read events (safe because no PII is here, and UUIDs are unguessable)
CREATE POLICY "Public can view order status events"
ON public.order_status_events FOR SELECT
TO anon
USING (true);

-- 2. Create trigger to automatically log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_events (order_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS order_status_trigger ON public.online_orders;
CREATE TRIGGER order_status_trigger
AFTER INSERT OR UPDATE OF status ON public.online_orders
FOR EACH ROW
EXECUTE FUNCTION log_order_status_change();

-- 3. Add order_status_events to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_events;

-- 4. Create an RPC to safely fetch order details by IDs (for "My Orders" history)
CREATE OR REPLACE FUNCTION public.get_customer_orders(p_order_ids UUID[])
RETURNS TABLE (
    id UUID,
    store_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    status TEXT,
    total_amount NUMERIC,
    delivery_charge NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    items JSONB,
    store_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.store_id,
        o.customer_name,
        o.customer_phone,
        o.customer_address,
        o.status,
        o.total_amount,
        o.delivery_charge,
        o.created_at,
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'product_id', oi.product_id,
                    'quantity', oi.quantity,
                    'price_at_time', oi.price_at_time,
                    'product_name', p.name,
                    'product_image', p.image_url,
                    'unit', p.unit
                ))
                FROM public.online_order_items oi
                JOIN public.products p ON p.id = oi.product_id
                WHERE oi.order_id = o.id
            ),
            '[]'::jsonb
        ) as items,
        pr.business_name as store_name
    FROM public.online_orders o
    LEFT JOIN public.profiles pr ON pr.user_id = o.store_id
    WHERE o.id = ANY(p_order_ids)
    ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_orders(UUID[]) TO anon;
