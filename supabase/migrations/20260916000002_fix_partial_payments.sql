-- Migration: Fix partial payment support on sales and purchases tables
-- Ensures amount_paid, balance_due, due_date, and status values are properly tracked

-- 1. Purchases table extension for partial payment tracking
ALTER TABLE IF EXISTS public.purchases 
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- 2. Back-fill purchases amounts
UPDATE public.purchases
  SET amount_paid = total_amount, balance_due = 0
  WHERE status = 'paid' AND (amount_paid = 0 OR amount_paid IS NULL);

UPDATE public.purchases
  SET amount_paid = 0, balance_due = total_amount
  WHERE status != 'paid' AND (balance_due = 0 OR balance_due IS NULL);

-- 3. Ensure sales table constraint allows partial and overdue
ALTER TABLE IF EXISTS public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE IF EXISTS public.sales ADD CONSTRAINT sales_status_check
  CHECK (status IN ('paid', 'pending', 'partial', 'cancelled', 'overdue'));
