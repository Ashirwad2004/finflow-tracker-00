-- ================================================================
-- COMPLETE ONLINE STORE FIX - Run this entire script in Supabase SQL Editor
-- ================================================================

-- STEP 1: Ensure all required columns exist on profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS store_slug TEXT,
    ADD COLUMN IF NOT EXISTS is_store_active BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS store_name TEXT;

-- Make store_slug unique only if there's no conflict
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_store_slug_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_store_slug_key UNIQUE (store_slug);
    END IF;
END$$;

-- STEP 2: Ensure all required columns exist on products
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_listed_online BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS online_description TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- STEP 3: Create online_orders table
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

-- STEP 4: Create online_order_items table
CREATE TABLE IF NOT EXISTS public.online_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 5: Enable RLS on new tables
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 6: GRANT table access to anon role (CRITICAL for public storefront)
-- ================================================================
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.products TO anon;
GRANT INSERT, SELECT ON public.online_orders TO anon;
GRANT INSERT, SELECT ON public.online_order_items TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- ================================================================
-- STEP 7: Fix RLS policies - profiles
-- ================================================================
DROP POLICY IF EXISTS "Public can view active stores" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Allow authenticated users to view their own profile
CREATE POLICY "Authenticated users view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Allow anon/public to view any profile with is_store_active = true (for store lookup)
CREATE POLICY "Public can view active stores"
ON public.profiles FOR SELECT
USING (is_store_active = true);

-- ================================================================
-- STEP 8: Fix RLS policies - products
-- ================================================================
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Public can view online listed products" ON public.products;

-- Authenticated owners can see all their products
CREATE POLICY "Users can view their own products"
ON public.products FOR SELECT
USING (auth.uid() = user_id);

-- Anyone (including anon) can see products that are listed online from active stores
CREATE POLICY "Public can view online listed products"
ON public.products FOR SELECT
USING (
    is_listed_online = true
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = products.user_id
        AND profiles.is_store_active = true
    )
);

-- ================================================================
-- STEP 9: Fix RLS policies - online_orders
-- ================================================================
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.online_orders;
DROP POLICY IF EXISTS "Store owners can update their orders" ON public.online_orders;
DROP POLICY IF EXISTS "Store owners can delete their orders" ON public.online_orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.online_orders;

CREATE POLICY "Store owners can view their orders"
ON public.online_orders FOR SELECT
USING (auth.uid() = store_id);

CREATE POLICY "Store owners can update their orders"
ON public.online_orders FOR UPDATE
USING (auth.uid() = store_id);

CREATE POLICY "Store owners can delete their orders"
ON public.online_orders FOR DELETE
USING (auth.uid() = store_id);

-- Allow anyone to place an order (no auth required)
CREATE POLICY "Public can insert orders"
ON public.online_orders FOR INSERT
WITH CHECK (true);

-- ================================================================
-- STEP 10: Fix RLS policies - online_order_items
-- ================================================================
DROP POLICY IF EXISTS "Store owners can view their order items" ON public.online_order_items;
DROP POLICY IF EXISTS "Store owners can update their order items" ON public.online_order_items;
DROP POLICY IF EXISTS "Store owners can delete their order items" ON public.online_order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.online_order_items;

CREATE POLICY "Store owners can view their order items"
ON public.online_order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.online_orders
        WHERE online_orders.id = online_order_items.order_id
        AND online_orders.store_id = auth.uid()
    )
);

CREATE POLICY "Store owners can update their order items"
ON public.online_order_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.online_orders
        WHERE online_orders.id = online_order_items.order_id
        AND online_orders.store_id = auth.uid()
    )
);

CREATE POLICY "Store owners can delete their order items"
ON public.online_order_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.online_orders
        WHERE online_orders.id = online_order_items.order_id
        AND online_orders.store_id = auth.uid()
    )
);

-- Allow anyone to insert order items (anon checkout)
CREATE POLICY "Public can insert order items"
ON public.online_order_items FOR INSERT
WITH CHECK (true);

-- ================================================================
-- DONE: Verify the setup (optional - run these SELECTs manually to check)
-- ================================================================
-- SELECT store_slug, is_store_active FROM profiles WHERE store_slug IS NOT NULL;
-- SELECT is_listed_online, COUNT(*) FROM products GROUP BY is_listed_online;
