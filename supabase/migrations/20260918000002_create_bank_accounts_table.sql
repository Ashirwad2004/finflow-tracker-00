-- Migration: Create multi-tenant bank_accounts table with RLS and add bank fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_no text,
ADD COLUMN IF NOT EXISTS bank_ifsc text,
ADD COLUMN IF NOT EXISTS bank_branch text;

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    branch_name TEXT,
    account_type TEXT NOT NULL DEFAULT 'checking',
    is_default BOOLEAN NOT NULL DEFAULT false,
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    od_limit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can view their own bank accounts"
    ON public.bank_accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can insert their own bank accounts"
    ON public.bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can update their own bank accounts"
    ON public.bank_accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can delete their own bank accounts"
    ON public.bank_accounts FOR DELETE
    USING (auth.uid() = user_id);
