-- Security hardening: remove client-controlled subscription writes and public order-history access.

DROP POLICY IF EXISTS "Users can update their own subscription status"
ON public.subscription_status;

DROP POLICY IF EXISTS "Users can insert their own subscription status"
ON public.subscription_status;

REVOKE INSERT, UPDATE, DELETE
ON public.subscription_status
FROM anon, authenticated;

GRANT SELECT
ON public.subscription_status
TO authenticated;

REVOKE EXECUTE
ON FUNCTION public.get_orders_by_phone(TEXT, UUID)
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.get_customer_orders(UUID[])
FROM anon;

-- Passwords are provisioned through Supabase Auth; do not retain plaintext values.
DROP TRIGGER IF EXISTS sync_store_salesman_to_auth_trigger
ON public.store_salesmen;
DROP FUNCTION IF EXISTS public.sync_store_salesman_to_auth();
ALTER TABLE public.store_salesmen
DROP COLUMN IF EXISTS salesman_password;

-- Rebuild anonymous storefront checkout using trusted product prices.
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
    v_product_id UUID;
    v_qty INTEGER;
    v_stock INTEGER;
    v_price NUMERIC;
    v_subtotal NUMERIC := 0;
    v_delivery_charge NUMERIC := 0;
    v_product_name TEXT;
BEGIN
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) NOT BETWEEN 1 AND 200 THEN
        RAISE EXCEPTION 'Invalid customer name';
    END IF;

    IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) NOT BETWEEN 3 AND 30 THEN
        RAISE EXCEPTION 'Invalid customer phone';
    END IF;

    IF jsonb_typeof(p_items) = 'string' THEN
        v_items := (p_items #>> '{}')::JSONB;
    ELSE
        v_items := p_items;
    END IF;

    IF jsonb_typeof(v_items) <> 'array'
       OR jsonb_array_length(v_items) = 0
       OR jsonb_array_length(v_items) > 100 THEN
        RAISE EXCEPTION 'Invalid cart';
    END IF;

    IF (
        SELECT count(*)
        FROM (
            SELECT (item->>'product_id')::UUID
            FROM jsonb_array_elements(v_items) item
            GROUP BY (item->>'product_id')::UUID
        ) unique_items
    ) <> jsonb_array_length(v_items) THEN
        RAISE EXCEPTION 'Duplicate products are not allowed';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty IS NULL OR v_qty < 1 OR v_qty > 10000 THEN
            RAISE EXCEPTION 'Invalid quantity';
        END IF;

        SELECT p.stock_quantity, p.name, p.price
        INTO v_stock, v_product_name, v_price
        FROM public.products p
        JOIN public.profiles prof ON prof.user_id = p.user_id
        WHERE p.id = v_product_id
          AND p.user_id = p_store_id
          AND p.is_listed_online = true
          AND prof.is_store_active = true
        FOR UPDATE OF p;

        IF NOT FOUND OR v_price < 0 THEN
            RAISE EXCEPTION 'Product is not available';
        END IF;

        IF v_stock < v_qty THEN
            RAISE EXCEPTION '% does not have enough stock', v_product_name;
        END IF;

        v_subtotal := v_subtotal + (v_price * v_qty);
    END LOOP;

    SELECT COALESCE(prof.delivery_charge, 0)
    INTO v_delivery_charge
    FROM public.profiles prof
    WHERE prof.user_id = p_store_id
      AND prof.is_store_active = true;

    IF v_delivery_charge < 0 THEN
        RAISE EXCEPTION 'Invalid delivery charge';
    END IF;

    INSERT INTO public.online_orders (
        store_id,
        customer_name,
        customer_phone,
        customer_address,
        total_amount,
        delivery_charge,
        status,
        stock_reserved
    )
    VALUES (
        p_store_id,
        trim(p_customer_name),
        trim(p_customer_phone),
        NULLIF(trim(p_customer_address), ''),
        v_subtotal + v_delivery_charge,
        v_delivery_charge,
        'pending',
        true
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT p.price
        INTO v_price
        FROM public.products p
        WHERE p.id = v_product_id
          AND p.user_id = p_store_id
        FOR UPDATE;

        UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty
        WHERE id = v_product_id
          AND user_id = p_store_id;

        INSERT INTO public.online_order_items (
            order_id,
            product_id,
            quantity,
            price_at_time
        )
        VALUES (v_order_id, v_product_id, v_qty, v_price);
    END LOOP;

    RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB)
TO anon, authenticated;
