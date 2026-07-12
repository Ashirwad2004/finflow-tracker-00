-- SQL migration to add rack_location to products table
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS rack_location TEXT;
