-- Migration: SaaS-Grade Indian Banking, Treasury, Ledger & Bank Reconciliation (BRS)
-- Description: Adds tables for cloud persistent bank transactions, statement imports, statement lines, and cheque tracker with RLS.

-- 1. Enhance bank_accounts with optional styling & metadata
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS upi_id TEXT,
ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create bank_transactions (General Ledger)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'NEFT',
    reference_no TEXT,
    description TEXT,
    party_name TEXT,
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    matched_statement_line_id UUID,
    transfer_to_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    linked_contra_tx_id UUID REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
    linked_cheque_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for bank_transactions
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_acc_date ON public.bank_transactions(user_id, account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_ref ON public.bank_transactions(user_id, reference_no);
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_reconciled ON public.bank_transactions(user_id, is_reconciled);

-- Enable RLS on bank_transactions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bank transactions" ON public.bank_transactions;
CREATE POLICY "Users can view their own bank transactions"
    ON public.bank_transactions FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own bank transactions" ON public.bank_transactions;
CREATE POLICY "Users can insert their own bank transactions"
    ON public.bank_transactions FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own bank transactions" ON public.bank_transactions;
CREATE POLICY "Users can update their own bank transactions"
    ON public.bank_transactions FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own bank transactions" ON public.bank_transactions;
CREATE POLICY "Users can delete their own bank transactions"
    ON public.bank_transactions FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- 3. Create bank_statement_imports (Statement batch tracking)
CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    total_lines INTEGER NOT NULL DEFAULT 0,
    reconciled_lines INTEGER NOT NULL DEFAULT 0,
    opening_balance NUMERIC(15, 2),
    closing_balance NUMERIC(15, 2),
    start_date DATE,
    end_date DATE
);

CREATE INDEX IF NOT EXISTS idx_bank_stmt_imp_user_acc ON public.bank_statement_imports(user_id, account_id);

ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own statement imports" ON public.bank_statement_imports;
CREATE POLICY "Users can view their own statement imports"
    ON public.bank_statement_imports FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own statement imports" ON public.bank_statement_imports;
CREATE POLICY "Users can insert their own statement imports"
    ON public.bank_statement_imports FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own statement imports" ON public.bank_statement_imports;
CREATE POLICY "Users can update their own statement imports"
    ON public.bank_statement_imports FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own statement imports" ON public.bank_statement_imports;
CREATE POLICY "Users can delete their own statement imports"
    ON public.bank_statement_imports FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- 4. Create bank_statement_lines (Parsed rows for BRS matching)
CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    narration TEXT NOT NULL,
    reference_no TEXT,
    withdrawal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deposit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(15, 2),
    status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'created_in_ledger', 'ignored')),
    matched_tx_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
    matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stmt_lines_user_acc_status ON public.bank_statement_lines(user_id, account_id, status);
CREATE INDEX IF NOT EXISTS idx_stmt_lines_user_ref ON public.bank_statement_lines(user_id, reference_no);

ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own statement lines" ON public.bank_statement_lines;
CREATE POLICY "Users can view their own statement lines"
    ON public.bank_statement_lines FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own statement lines" ON public.bank_statement_lines;
CREATE POLICY "Users can insert their own statement lines"
    ON public.bank_statement_lines FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own statement lines" ON public.bank_statement_lines;
CREATE POLICY "Users can update their own statement lines"
    ON public.bank_statement_lines FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own statement lines" ON public.bank_statement_lines;
CREATE POLICY "Users can delete their own statement lines"
    ON public.bank_statement_lines FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);

-- 5. Create cheque_records (Cheques Issued & Received / PDCs)
CREATE TABLE IF NOT EXISTS public.cheque_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    cheque_type TEXT NOT NULL CHECK (cheque_type IN ('received', 'issued')),
    cheque_number TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clearance_date DATE,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'cleared', 'bounced', 'cancelled')),
    bounce_reason TEXT,
    linked_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cheques_user_acc_status ON public.cheque_records(user_id, account_id, status);
CREATE INDEX IF NOT EXISTS idx_cheques_user_due_date ON public.cheque_records(user_id, due_date);

ALTER TABLE public.cheque_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cheques" ON public.cheque_records;
CREATE POLICY "Users can view their own cheques"
    ON public.cheque_records FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own cheques" ON public.cheque_records;
CREATE POLICY "Users can insert their own cheques"
    ON public.cheque_records FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cheques" ON public.cheque_records;
CREATE POLICY "Users can update their own cheques"
    ON public.cheque_records FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own cheques" ON public.cheque_records;
CREATE POLICY "Users can delete their own cheques"
    ON public.cheque_records FOR DELETE
    TO authenticated
    USING ((select auth.uid()) = user_id);
