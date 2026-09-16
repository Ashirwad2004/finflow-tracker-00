-- Migration: Add notes column to sales and purchases tables
-- Fixes PGRST204 error when recording payments and invoice seller notes

ALTER TABLE IF EXISTS public.sales 
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS public.purchases 
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
