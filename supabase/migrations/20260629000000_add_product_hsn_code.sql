-- SQL migration to add hsn_code to products table
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS hsn_code TEXT;
