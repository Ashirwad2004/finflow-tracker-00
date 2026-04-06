-- ================================================================
-- ADD DELIVERY CHARGE FEATURE
-- Extends profiles, online_orders and related RPCs
-- ================================================================

-- Step 1: Add delivery charge to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC DEFAULT 0;

-- Step 2: Add delivery charge to online orders
ALTER TABLE public.online_orders
    ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC DEFAULT 0;

-- Step 3: Update get_public_store to return delivery config
DROP FUNCTION IF EXISTS public.get_public_store(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
    user_id         UUID,
    display_name    TEXT,
    business_name   TEXT,
    business_logo   TEXT,
    store_slug      TEXT,
    is_store_active BOOLEAN,
    delivery_charge NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.user_id,
        pr.display_name,
        pr.business_name,
        pr.business_logo,
        pr.store_slug,
        pr.is_store_active,
        pr.delivery_charge
    FROM public.profiles pr
    WHERE pr.store_slug = p_slug
      AND pr.is_store_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO anon;

-- Step 4: Update place_online_order to accept delivery charge
DROP FUNCTION IF EXISTS public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, JSONB);
CREATE OR REPLACE FUNCTION public.place_online_order(
    p_store_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_total_amount NUMERIC,
    p_delivery_charge NUMERIC,
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
    -- Normalize JSON items
    IF jsonb_typeof(p_items) = 'string' THEN
        v_items := (p_items #>> '{}')::JSONB;
    ELSE
        v_items := p_items;
    END IF;

    -- Insert order with delivery charge
    INSERT INTO public.online_orders (
        store_id,
        customer_name,
        customer_phone,
        customer_address,
        total_amount,
        delivery_charge,
        status
    )
    VALUES (
        p_store_id,
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        p_total_amount,
        p_delivery_charge,
        'pending'
    )
    RETURNING id INTO v_order_id;

    -- Insert items
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

GRANT EXECUTE ON FUNCTION public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB) TO anon;
