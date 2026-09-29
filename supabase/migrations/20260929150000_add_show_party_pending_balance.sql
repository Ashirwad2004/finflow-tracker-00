-- Migration: Add show_party_pending_balance and sales_settings to user_settings table
-- Enables per-store/merchant persistence of sales preferences

ALTER TABLE IF EXISTS public.user_settings 
ADD COLUMN IF NOT EXISTS show_party_pending_balance BOOLEAN DEFAULT TRUE;

ALTER TABLE IF EXISTS public.user_settings 
ADD COLUMN IF NOT EXISTS sales_settings JSONB DEFAULT '{}'::jsonb;
