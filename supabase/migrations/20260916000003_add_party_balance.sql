-- Migration: Add opening_balance to parties and ensure party_id relationship
ALTER TABLE IF EXISTS public.parties 
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;

-- Ensure index on sales.party_id for quick party statement and balance queries
CREATE INDEX IF NOT EXISTS idx_sales_party_id ON public.sales(party_id);
