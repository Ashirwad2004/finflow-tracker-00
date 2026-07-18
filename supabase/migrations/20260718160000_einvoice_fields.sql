-- Migration: Add E-Invoice Fields to sales table
ALTER TABLE IF EXISTS public.sales 
ADD COLUMN IF NOT EXISTS irn varchar(64),
ADD COLUMN IF NOT EXISTS irn_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS eway_bill_number varchar(15),
ADD COLUMN IF NOT EXISTS qr_code text;
