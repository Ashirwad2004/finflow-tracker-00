-- Migration: Fix Inventory Tenant Isolation on Products Table
-- Prevents authenticated users from viewing products created by other merchants.

-- 1. Ensure authenticated users only see their own products when querying public.products
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view their own products"
  ON public.products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Restrict public online catalog visibility strictly to anon (unauthenticated visitors)
-- Storefront RPC functions (get_public_store_products) handle storefront querying with store_id filtering.
DROP POLICY IF EXISTS "Public can view online listed products" ON public.products;
CREATE POLICY "Public can view online listed products"
  ON public.products FOR SELECT
  TO anon
  USING (
    is_listed_online = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = products.user_id
      AND profiles.is_store_active = true
    )
  );
