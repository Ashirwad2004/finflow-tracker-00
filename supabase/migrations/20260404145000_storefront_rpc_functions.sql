-- ================================================================
-- FINAL FIX: Use SECURITY DEFINER functions for the public storefront
-- This approach bypasses RLS entirely for read-only public queries.
-- No table-level GRANTs needed. Works 100% reliably.
-- ================================================================

-- ── Column safety (idempotent) ───────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS store_slug TEXT,
    ADD COLUMN IF NOT EXISTS is_store_active BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS store_name TEXT;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_listed_online BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS online_description TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Unique constraint on store_slug (safe to re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_store_slug_key'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_store_slug_key UNIQUE (store_slug);
    END IF;
END$$;

-- ── Order tables (idempotent) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.online_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.online_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;

-- ── Standard owner-only RLS for online_orders ────────────────────
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.online_orders;
DROP POLICY IF EXISTS "Store owners can update their orders" ON public.online_orders;
DROP POLICY IF EXISTS "Store owners can delete their orders" ON public.online_orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.online_orders;

CREATE POLICY "Store owners can view their orders"
    ON public.online_orders FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Store owners can update their orders"
    ON public.online_orders FOR UPDATE USING (auth.uid() = store_id);

CREATE POLICY "Store owners can delete their orders"
    ON public.online_orders FOR DELETE USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Store owners can view their order items" ON public.online_order_items;
DROP POLICY IF EXISTS "Store owners can update their order items" ON public.online_order_items;
DROP POLICY IF EXISTS "Store owners can delete their order items" ON public.online_order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.online_order_items;

CREATE POLICY "Store owners can view their order items"
    ON public.online_order_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.online_orders
        WHERE online_orders.id = online_order_items.order_id
        AND online_orders.store_id = auth.uid()
    ));

CREATE POLICY "Store owners can update their order items"
    ON public.online_order_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.online_orders
        WHERE online_orders.id = online_order_items.order_id
        AND online_orders.store_id = auth.uid()
    ));

CREATE POLICY "Store owners can delete their order items"
    ON public.online_order_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.online_orders
        WHERE online_orders.id = online_order_items.order_id
        AND online_orders.store_id = auth.uid()
    ));

-- ================================================================
-- SECURITY DEFINER FUNCTIONS for the public storefront
-- These run as the DB owner, bypassing RLS completely.
-- This is the correct, production-grade approach.
-- ================================================================

-- 1. Look up a public store by slug
CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    store_slug TEXT,
    is_store_active BOOLEAN
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
        pr.store_slug,
        pr.is_store_active
    FROM public.profiles pr
    WHERE pr.store_slug = p_slug
      AND pr.is_store_active = true
    LIMIT 1;
END;
$$;

-- 2. Get all publicly listed products for a store
CREATE OR REPLACE FUNCTION public.get_public_store_products(p_store_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    price NUMERIC,
    unit TEXT,
    image_url TEXT,
    online_description TEXT,
    stock_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.name,
        p.price,
        p.unit,
        p.image_url,
        p.online_description,
        p.stock_quantity
    FROM public.products p
    JOIN public.profiles prof ON prof.user_id = p.user_id
    WHERE p.user_id = p_store_id
      AND p.is_listed_online = true
      AND prof.is_store_active = true;
END;
$$;

-- 3. Place an online order (atomically creates order + items)
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
BEGIN
    -- Insert the parent order
    INSERT INTO public.online_orders (
        store_id, customer_name, customer_phone,
        customer_address, total_amount, status
    )
    VALUES (
        p_store_id, p_customer_name, p_customer_phone,
        p_customer_address, p_total_amount, 'pending'
    )
    RETURNING id INTO v_order_id;

    -- Insert each line item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.online_order_items (
            order_id, product_id, quantity, price_at_time
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

-- ── Grant EXECUTE to anon (all that's needed for SECURITY DEFINER) ──
GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_store_products(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.place_online_order(UUID, TEXT, TEXT, TEXT, NUMERIC, JSONB) TO anon;

-- Also grant USAGE on schema so anon can resolve it
GRANT USAGE ON SCHEMA public TO anon;

-- ── Verification queries (run manually to confirm) ───────────────
-- SELECT * FROM public.get_public_store('your-slug-here');
-- SELECT * FROM public.get_public_store_products('your-user-id-here'::uuid);
