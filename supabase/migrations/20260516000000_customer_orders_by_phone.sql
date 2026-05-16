-- ================================================================
-- FETCH CUSTOMER ORDERS BY PHONE NUMBER (CROSS-DEVICE SUPPORT)
-- ================================================================

-- Create new RPC to fetch orders by phone number instead of order IDs
-- This allows customers to see their orders across different browsers/devices
CREATE OR REPLACE FUNCTION public.get_orders_by_phone(
    p_phone TEXT,
    p_store_id UUID DEFAULT NULL
)
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
    WHERE o.customer_phone = p_phone
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
    ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_orders_by_phone(TEXT, UUID) TO anon;