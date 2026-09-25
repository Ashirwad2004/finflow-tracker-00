-- Migration: Add optional billing_address and shipping_address to sales and purchases
-- Ensures complete parity across Orders, Sales, and Purchases

ALTER TABLE IF EXISTS public.sales 
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

ALTER TABLE IF EXISTS public.purchases 
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Add updated_at to order junction tables for compatibility
ALTER TABLE IF EXISTS public.sale_order_invoices 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE IF EXISTS public.sale_order_purchase_orders 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE IF EXISTS public.purchase_order_bills 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
