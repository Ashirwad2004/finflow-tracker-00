-- ============================================================
-- Fix Online Store: Grant public (anon) access to necessary tables
-- ============================================================

-- 1. Grant SELECT on profiles to anon role (for slug lookup)
GRANT SELECT ON public.profiles TO anon;

-- 2. Grant SELECT on products to anon role (for storefront product listing)
GRANT SELECT ON public.products TO anon;

-- 3. Grant INSERT on online_orders and online_order_items to anon role
GRANT INSERT ON public.online_orders TO anon;
GRANT INSERT ON public.online_order_items TO anon;
GRANT SELECT ON public.online_orders TO anon;

-- ============================================================
-- Fix profiles RLS: allow anon to read store profiles by slug
-- ============================================================

-- The existing profiles RLS policy only allows auth.uid() = user_id
-- We need to allow public access for active store profiles
DROP POLICY IF EXISTS "Public can view active stores" ON public.profiles;
CREATE POLICY "Public can view active stores"
ON public.profiles
FOR SELECT
USING (
    -- Either the user is reading their own profile
    auth.uid() = user_id
    -- OR it is an active store being accessed publicly
    OR is_store_active = true
);

-- ============================================================
-- Fix products RLS: allow anon to read online-listed products
-- ============================================================

-- Drop and recreate to cleanly handle both authenticated and public reads
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view their own products"
ON public.products
FOR SELECT
USING (
    -- Authenticated user reading their own products
    auth.uid() = user_id
    -- OR public visitor viewing a listed product from an active store
    OR (
        is_listed_online = true
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = products.user_id
            AND profiles.is_store_active = true
        )
    )
);

-- ============================================================
-- Fix online_orders RLS: allow anon to insert orders
-- ============================================================
DROP POLICY IF EXISTS "Public can insert orders" ON public.online_orders;
CREATE POLICY "Public can insert orders"
ON public.online_orders
FOR INSERT
WITH CHECK (true);

-- ============================================================
-- Fix online_order_items RLS: allow anon to insert order items
-- ============================================================
DROP POLICY IF EXISTS "Public can insert order items" ON public.online_order_items;
CREATE POLICY "Public can insert order items"
ON public.online_order_items
FOR INSERT
WITH CHECK (true);
