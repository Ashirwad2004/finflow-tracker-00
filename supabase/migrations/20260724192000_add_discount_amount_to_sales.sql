-- Migration: Add discount_amount to sales table
ALTER TABLE IF EXISTS public.sales 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;