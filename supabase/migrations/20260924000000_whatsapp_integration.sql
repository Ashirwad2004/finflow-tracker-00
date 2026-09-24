-- ==============================================================================
-- Migration: 20260924000000_whatsapp_integration.sql
-- Description: WhatsApp integration tables, tenant isolation, and audit logging
-- ==============================================================================

-- 1. Create whatsapp_connections table for multi-tenant WhatsApp sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'openwa',
    provider_session_id TEXT NOT NULL,
    phone_number TEXT,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected', 'connecting', 'qr_required', 'connected', 'error'
    qr_code_data TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_connected_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_whatsapp_connections_store_provider UNIQUE (store_id, provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_store_id ON public.whatsapp_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON public.whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_session_id ON public.whatsapp_connections(provider_session_id);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Store staff can view whatsapp_connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Store owners can manage whatsapp_connections" ON public.whatsapp_connections;

-- Policy: Store owners and active store salesmen can view WhatsApp connections
CREATE POLICY "Store staff can view whatsapp_connections" ON public.whatsapp_connections
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id 
        OR (SELECT auth.uid()) = store_id
        OR EXISTS (
            SELECT 1 FROM public.store_salesmen sm 
            WHERE sm.store_id = whatsapp_connections.store_id 
            AND LOWER(sm.salesman_email) = LOWER((SELECT auth.jwt()->>'email'))
            AND sm.is_active = true
        )
    );

-- Policy: Store owners can insert/update/delete their store's WhatsApp connection
CREATE POLICY "Store owners can manage whatsapp_connections" ON public.whatsapp_connections
    FOR ALL
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id 
        OR (SELECT auth.uid()) = store_id
    )
    WITH CHECK (
        (SELECT auth.uid()) = user_id 
        OR (SELECT auth.uid()) = store_id
    );

GRANT ALL ON public.whatsapp_connections TO authenticated;


-- 2. Create whatsapp_messages audit and logging table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
    party_id UUID,
    invoice_id UUID,
    payment_id TEXT,
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'invoice', 'receipt', 'reminder', 'order_confirmation', 'custom'
    message_content TEXT,
    has_attachment BOOLEAN DEFAULT false,
    attachment_filename TEXT,
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'failed'
    error_message TEXT,
    idempotency_key TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance & audit querying
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_store_id ON public.whatsapp_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_invoice_id ON public.whatsapp_messages(invoice_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone_number);

-- Unique partial index for idempotency protection per store
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_store_idempotency 
    ON public.whatsapp_messages(store_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Store staff can view whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Store staff can insert whatsapp_messages" ON public.whatsapp_messages;

-- Policy: Store owners and active salesmen can view message audit logs
CREATE POLICY "Store staff can view whatsapp_messages" ON public.whatsapp_messages
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id 
        OR (SELECT auth.uid()) = store_id
        OR EXISTS (
            SELECT 1 FROM public.store_salesmen sm 
            WHERE sm.store_id = whatsapp_messages.store_id 
            AND LOWER(sm.salesman_email) = LOWER((SELECT auth.jwt()->>'email'))
            AND sm.is_active = true
        )
    );

-- Policy: Store owners and active salesmen can insert new message logs
CREATE POLICY "Store staff can insert whatsapp_messages" ON public.whatsapp_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = user_id 
        OR (SELECT auth.uid()) = store_id
        OR EXISTS (
            SELECT 1 FROM public.store_salesmen sm 
            WHERE sm.store_id = whatsapp_messages.store_id 
            AND LOWER(sm.salesman_email) = LOWER((SELECT auth.jwt()->>'email'))
            AND sm.is_active = true
        )
    );

GRANT ALL ON public.whatsapp_messages TO authenticated;
