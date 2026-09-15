-- Migration: Allow SaaS subscription payments in payments table
-- Subscription payments do not link to storefront online_orders, so order_id must be nullable.
-- Also add notes jsonb column to store planId, billingCycle, etc.

ALTER TABLE public.payments ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}'::jsonb;
