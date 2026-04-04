-- Add store configuration to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS store_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_store_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS store_name TEXT;

-- Add online listing fields to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_listed_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS online_description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create online orders table
CREATE TABLE IF NOT EXISTS public.online_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, completed, rejected
    total_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create online order items table
CREATE TABLE IF NOT EXISTS public.online_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies for public Store reading
-- We only need a policy allowing anyone to read profiles that have is_store_active = true
DROP POLICY IF EXISTS "Public can view active stores" ON public.profiles;
CREATE POLICY "Public can view active stores"
ON public.profiles FOR SELECT
USING (is_store_active = true);

-- Products Policies for public reading
DROP POLICY IF EXISTS "Public can view online listed products" ON public.products;
CREATE POLICY "Public can view online listed products"
ON public.products FOR SELECT
USING (is_listed_online = true AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = products.user_id AND profiles.is_store_active = true
));

-- Online Orders Policies
-- Store owner can view their orders
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.online_orders;
CREATE POLICY "Store owners can view their orders"
ON public.online_orders FOR SELECT
USING (auth.uid() = store_id);

-- Store owner can update their orders
DROP POLICY IF EXISTS "Store owners can update their orders" ON public.online_orders;
CREATE POLICY "Store owners can update their orders"
ON public.online_orders FOR UPDATE
USING (auth.uid() = store_id);

-- Store owner can delete their orders
DROP POLICY IF EXISTS "Store owners can delete their orders" ON public.online_orders;
CREATE POLICY "Store owners can delete their orders"
ON public.online_orders FOR DELETE
USING (auth.uid() = store_id);

-- Public can insert orders
DROP POLICY IF EXISTS "Public can insert orders" ON public.online_orders;
CREATE POLICY "Public can insert orders"
ON public.online_orders FOR INSERT
WITH CHECK (true);

-- Online Order Items Policies
-- Store owner can view their order items
DROP POLICY IF EXISTS "Store owners can view their order items" ON public.online_order_items;
CREATE POLICY "Store owners can view their order items"
ON public.online_order_items FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.online_orders
    WHERE online_orders.id = online_order_items.order_id AND online_orders.store_id = auth.uid()
));

-- Store owner can update their order items
DROP POLICY IF EXISTS "Store owners can update their order items" ON public.online_order_items;
CREATE POLICY "Store owners can update their order items"
ON public.online_order_items FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.online_orders
    WHERE online_orders.id = online_order_items.order_id AND online_orders.store_id = auth.uid()
));

-- Store owner can delete their order items
DROP POLICY IF EXISTS "Store owners can delete their order items" ON public.online_order_items;
CREATE POLICY "Store owners can delete their order items"
ON public.online_order_items FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.online_orders
    WHERE online_orders.id = online_order_items.order_id AND online_orders.store_id = auth.uid()
));

-- Public can insert order items
DROP POLICY IF EXISTS "Public can insert order items" ON public.online_order_items;
CREATE POLICY "Public can insert order items"
ON public.online_order_items FOR INSERT
WITH CHECK (true);