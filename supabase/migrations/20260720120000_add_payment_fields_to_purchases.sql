-- Migration: Add payment, notes, and overdue tracking fields to purchases & sales tables

-- Purchases Table Extensions
ALTER TABLE IF EXISTS public.purchases 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_gstin TEXT,
ADD COLUMN IF NOT EXISTS place_of_supply TEXT;

-- Sales Table Extensions
ALTER TABLE IF EXISTS public.sales 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS customer_gstin TEXT,
ADD COLUMN IF NOT EXISTS place_of_supply TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice',
ADD COLUMN IF NOT EXISTS original_invoice_id UUID,
ADD COLUMN IF NOT EXISTS irn TEXT,
ADD COLUMN IF NOT EXISTS eway_bill_number TEXT,
ADD COLUMN IF NOT EXISTS qr_code TEXT;
