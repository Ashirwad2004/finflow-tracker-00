-- Add party and transaction_type columns to expenses table
ALTER TABLE public.expenses ADD COLUMN party TEXT;
ALTER TABLE public.expenses ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('received', 'payable'));