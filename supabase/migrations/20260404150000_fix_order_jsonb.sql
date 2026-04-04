-- Fix place_online_order: handle JSONB array correctly
-- The previous version failed when receiving a JSON string instead of JSONB array

CREATE OR REPLACE FUNCTION public.place_online_order(
    p_store_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_total_amount NUMERIC,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_items JSONB;
BEGIN
    -- Normalize: if p_items is a JSON string (double-encoded), unwrap it
    IF jsonb_typeof(p_items) = 'string' THEN
        v_items := (p_items #>> '{}')::JSONB;
    ELSE
        v_items := p_items;
    END IF;

    -- Insert the parent order row
    INSERT INTO public.online_orders (
        store_id,
        customer_name,
        customer_phone,
        customer_address,
        total_amount,
        status
    )
    VALUES (
        p_store_id,
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        p_total_amount,
        'pending'
    )
    RETURNING id INTO v_order_id;

    -- Insert each line item
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        INSERT INTO public.online_order_items (
            order_id,
            product_id,
            quantity,
            price_at_time
        )
        VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price_at_time')::NUMERIC
        );
    END LOOP;

    RETURN v_order_id;
END;
$$;

-- Re-grant to anon
GRANT EXECUTE ON FUNCTION public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, JSONB) TO anon;