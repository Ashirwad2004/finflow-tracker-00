-- Add permissions columns to store_salesmen
ALTER TABLE public.store_salesmen
ADD COLUMN IF NOT EXISTS can_manage_orders BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_manage_returns BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Update RLS policies to enforce is_active and feature permissions for salesmen

-- 1. online_orders Policies
DROP POLICY IF EXISTS "Salesmen can view orders of assigned store" ON public.online_orders;
CREATE POLICY "Salesmen can view orders of assigned store"
    ON public.online_orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = online_orders.store_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
            AND store_salesmen.is_active = true
        )
    );

DROP POLICY IF EXISTS "Salesmen can update orders of assigned store" ON public.online_orders;
CREATE POLICY "Salesmen can update orders of assigned store"
    ON public.online_orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = online_orders.store_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
            AND store_salesmen.is_active = true
            AND store_salesmen.can_manage_orders = true
        )
    );

-- 2. online_order_items Policies
DROP POLICY IF EXISTS "Salesmen can view order items of assigned store" ON public.online_order_items;
CREATE POLICY "Salesmen can view order items of assigned store"
    ON public.online_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.online_orders
            JOIN public.store_salesmen ON store_salesmen.store_id = online_orders.store_id
            WHERE online_orders.id = online_order_items.order_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
            AND store_salesmen.is_active = true
        )
    );

-- 3. order_returns Policies
DROP POLICY IF EXISTS "Salesmen can view returns of assigned store" ON public.order_returns;
CREATE POLICY "Salesmen can view returns of assigned store"
    ON public.order_returns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.online_orders
            JOIN public.store_salesmen ON store_salesmen.store_id = online_orders.store_id
            WHERE online_orders.id = order_returns.order_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
            AND store_salesmen.is_active = true
        )
    );

DROP POLICY IF EXISTS "Salesmen can update returns of assigned store" ON public.order_returns;
CREATE POLICY "Salesmen can update returns of assigned store"
    ON public.order_returns FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.online_orders
            JOIN public.store_salesmen ON store_salesmen.store_id = online_orders.store_id
            WHERE online_orders.id = order_returns.order_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
            AND store_salesmen.is_active = true
            AND store_salesmen.can_manage_returns = true
        )
    );

-- 4. products Policies
DROP POLICY IF EXISTS "Salesmen can view products of assigned store" ON public.products;
CREATE POLICY "Salesmen can view products of assigned store"
    ON public.products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = products.user_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
            AND store_salesmen.is_active = true
        )
    );
