-- Migration: Add partial payment support to sales table
-- Adds amount_paid and balance_due columns, extends status to include 'partial'

-- Add payment tracking columns
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;

-- Extend status CHECK constraint to include 'partial' and 'overdue'
-- Drop old constraint first (it was defined inline, name follows Postgres convention)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check
  CHECK (status IN ('paid', 'pending', 'partial', 'cancelled', 'overdue'));

-- Back-fill existing rows: paid → amount_paid = total_amount, balance_due = 0
UPDATE public.sales
  SET amount_paid = total_amount, balance_due = 0
  WHERE status = 'paid' AND amount_paid = 0;

-- Back-fill pending rows: amount_paid = 0, balance_due = total_amount
UPDATE public.sales
  SET amount_paid = 0, balance_due = total_amount
  WHERE status = 'pending' AND balance_due = 0;
