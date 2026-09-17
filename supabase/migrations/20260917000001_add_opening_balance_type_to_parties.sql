-- Migration: Add opening_balance_type to parties (receivable vs payable opening balance)
ALTER TABLE IF EXISTS public.parties
  ADD COLUMN IF NOT EXISTS opening_balance_type TEXT DEFAULT 'to_receive';

-- Backfill legacy vendors as to_pay
UPDATE public.parties
  SET opening_balance_type = 'to_pay'
  WHERE type = 'vendor' AND (opening_balance_type IS NULL OR opening_balance_type = 'to_receive');

-- Backfill remainder as to_receive
UPDATE public.parties
  SET opening_balance_type = 'to_receive'
  WHERE opening_balance_type IS NULL;
