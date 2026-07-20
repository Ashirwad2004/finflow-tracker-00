-- Migration: 20260718200000_event_queue.sql
-- Description: Creates an asynchronous background task queue using pg_net webhooks

-- 1. Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Create the event_queue table
CREATE TABLE IF NOT EXISTS public.event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast polling/status checks
CREATE INDEX IF NOT EXISTS idx_event_queue_status ON public.event_queue(status);

-- 3. Webhook Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_event_worker()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT;
    anon_key TEXT;
    auth_header TEXT;
BEGIN
    -- Production Level: Retrieve securely stored secrets from Supabase Vault
    -- To set these up in production, run:
    -- SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/event-worker', 'worker_url');
    -- SELECT vault.create_secret('your-anon-key', 'worker_anon_key');
    
    SELECT secret INTO webhook_url FROM vault.decrypted_secrets WHERE name = 'worker_url' LIMIT 1;
    SELECT secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'worker_anon_key' LIMIT 1;
    
    -- Fallbacks for local testing if Vault isn't configured
    IF webhook_url IS NULL THEN
        webhook_url := current_setting('app.settings.worker_url', true);
    END IF;
    
    IF anon_key IS NULL THEN
        anon_key := current_setting('app.settings.worker_anon_key', true);
    END IF;

    -- Construct Auth Header
    IF anon_key IS NOT NULL THEN
        auth_header := 'Bearer ' || anon_key;
    ELSE
        auth_header := 'Bearer NONE';
    END IF;

    -- Make asynchronous HTTP POST request to the Edge Function via pg_net
    IF webhook_url IS NOT NULL THEN
        PERFORM net.http_post(
            url := webhook_url,
            headers := json_build_object(
                'Content-Type', 'application/json',
                'Authorization', auth_header
            )::jsonb,
            body := json_build_object('record', row_to_json(NEW))::jsonb
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the Trigger
DROP TRIGGER IF EXISTS on_event_queued ON public.event_queue;
CREATE TRIGGER on_event_queued
    AFTER INSERT ON public.event_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_event_worker();

-- 5. RLS Policies
ALTER TABLE public.event_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" 
ON public.event_queue FOR SELECT 
USING (
    payload->>'user_id' = auth.uid()::text
);

CREATE POLICY "Users can queue events" 
ON public.event_queue FOR INSERT 
WITH CHECK (
    payload->>'user_id' = auth.uid()::text
);
