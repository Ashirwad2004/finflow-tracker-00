-- ================================================================
-- LIVE INVENTORY: atomic stock on online orders + realtime products
-- ================================================================

-- Track whether stock was deducted for an online order (restore on reject)
ALTER TABLE public.online_orders
    ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN NOT NULL DEFAULT false;

-- Restore stock when merchant rejects a pending order
CREATE OR REPLACE FUNCTION public.restore_online_order_stock(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM public.online_order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.product_id = p.id;

    UPDATE public.online_orders
    SET stock_reserved = false
    WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_online_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'rejected'
       AND OLD.status IS DISTINCT FROM 'rejected'
       AND COALESCE(OLD.stock_reserved, false) THEN
        PERFORM public.restore_online_order_stock(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS online_order_stock_restore_trigger ON public.online_orders;
CREATE TRIGGER online_order_stock_restore_trigger
    AFTER UPDATE OF status ON public.online_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_online_order_status_change();

-- place_online_order: validate stock, deduct atomically, reserve flag
DROP FUNCTION IF EXISTS public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB);

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
    v_product_name TEXT;
BEGIN
    IF jsonb_typeof(p_items) = 'string' THEN
        v_items := (p_items #>> '{}')::JSONB;
    ELSE
        v_items := p_items;
    END IF;

    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RAISE EXCEPTION 'Your cart is empty.';
    END IF;

    -- Lock rows and validate availability before creating the order
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := GREATEST((v_item->>'quantity')::INTEGER, 0);

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity for one or more items.';
        END IF;

        SELECT p.stock_quantity, p.name
        INTO v_stock, v_product_name
        FROM public.products p
        JOIN public.profiles prof ON prof.user_id = p.user_id
        WHERE p.id = v_product_id
          AND p.user_id = p_store_id
          AND p.is_listed_online = true
          AND prof.is_store_active = true
        FOR UPDATE OF p;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'One or more products are no longer available.';
        END IF;

        IF v_stock < v_qty THEN
            IF v_stock <= 0 THEN
                RAISE EXCEPTION '% is out of stock.', v_product_name;
            ELSE
                RAISE EXCEPTION '% only has % left in stock.', v_product_name, v_stock;
            END IF;
        END IF;
    END LOOP;

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
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        p_total_amount,
        COALESCE(p_delivery_charge, 0),
        'pending',
        true
    )
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty
        WHERE id = v_product_id;

        INSERT INTO public.online_order_items (
            order_id,
            product_id,
            quantity,
            price_at_time
        )
        VALUES (
            v_order_id,
            v_product_id,
            v_qty,
            (v_item->>'price_at_time')::NUMERIC
        );
    END LOOP;

    RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB) TO anon;

-- Realtime: push live stock updates to storefront and admin inventory
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
END $$;
