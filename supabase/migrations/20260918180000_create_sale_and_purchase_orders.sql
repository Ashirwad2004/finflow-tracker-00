-- ============================================================================
-- Migration: 20260918180000_create_sale_and_purchase_orders.sql
-- Description: Creates tables for Sale Orders, Purchase Orders, and their
--              document relationship tracking (invoices, procurement POs, bills).
-- ============================================================================

-- 1. SALE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.sale_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_number text NOT NULL,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  customer_gstin text,
  billing_address text,
  shipping_address text,
  place_of_supply text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  status text NOT NULL CHECK (status IN ('draft', 'confirmed', 'partially_delivered', 'delivered', 'cancelled')) DEFAULT 'confirmed',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  notes text,
  terms_conditions text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PURCHASE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  po_number text NOT NULL,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  vendor_name text NOT NULL,
  vendor_phone text,
  vendor_email text,
  vendor_gstin text,
  billing_address text,
  shipping_address text,
  place_of_supply text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')) DEFAULT 'sent',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  notes text,
  terms_conditions text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SALE ORDER TO SALE INVOICES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.sale_order_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_order_id uuid REFERENCES public.sale_orders(id) ON DELETE CASCADE NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  delivered_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SALE ORDER TO PURCHASE ORDERS (PROCUREMENT) JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.sale_order_purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_order_id uuid REFERENCES public.sale_orders(id) ON DELETE CASCADE NOT NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  procured_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PURCHASE ORDER TO PURCHASE BILLS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.purchase_order_bills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  received_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sale_orders_user_status ON public.sale_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sale_orders_party_id ON public.sale_orders(party_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON public.sale_orders(user_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_status ON public.purchase_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_party_id ON public.purchase_orders(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(user_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_so_invoices_so_id ON public.sale_order_invoices(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_so_invoices_sale_id ON public.sale_order_invoices(sale_id);

CREATE INDEX IF NOT EXISTS idx_so_po_so_id ON public.sale_order_purchase_orders(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_so_po_po_id ON public.sale_order_purchase_orders(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_po_bills_po_id ON public.purchase_order_bills(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_bills_purchase_id ON public.purchase_order_bills(purchase_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.sale_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_order_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_bills ENABLE ROW LEVEL SECURITY;

-- Policies: sale_orders
CREATE POLICY "Users can view their own sale orders"
  ON public.sale_orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own sale orders"
  ON public.sale_orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own sale orders"
  ON public.sale_orders FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own sale orders"
  ON public.sale_orders FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Policies: purchase_orders
CREATE POLICY "Users can view their own purchase orders"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own purchase orders"
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own purchase orders"
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own purchase orders"
  ON public.purchase_orders FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Policies: sale_order_invoices
CREATE POLICY "Users can manage their own sale_order_invoices"
  ON public.sale_order_invoices FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Policies: sale_order_purchase_orders
CREATE POLICY "Users can manage their own sale_order_purchase_orders"
  ON public.sale_order_purchase_orders FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Policies: purchase_order_bills
CREATE POLICY "Users can manage their own purchase_order_bills"
  ON public.purchase_order_bills FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
