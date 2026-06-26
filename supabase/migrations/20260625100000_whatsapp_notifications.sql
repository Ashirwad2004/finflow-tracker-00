    -- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT UNIQUE NOT NULL,
    master BOOLEAN DEFAULT true,
    phone TEXT DEFAULT '',
    dnd_start TEXT DEFAULT '21:00',
    dnd_end TEXT DEFAULT '09:00',
    invoice_created BOOLEAN DEFAULT true,
    invoice_due_soon BOOLEAN DEFAULT true,
    invoice_overdue BOOLEAN DEFAULT true,
    payment_received BOOLEAN DEFAULT true,
    payment_failed BOOLEAN DEFAULT true,
    refund_issued BOOLEAN DEFAULT false,
    subscription_expiring BOOLEAN DEFAULT true,
    subscription_renewed BOOLEAN DEFAULT false,
    subscription_cancelled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON notification_settings;
CREATE POLICY "Users can manage their own notification settings" ON notification_settings
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = customer_id)
    WITH CHECK (auth.uid()::text = customer_id);

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    template_name TEXT,
    status TEXT,          -- sent / failed / skipped
    skip_reason TEXT,     -- not_opted_in / dnd_hours / daily_limit_reached
    message_id TEXT,      -- WhatsApp message ID on success
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create
DROP POLICY IF EXISTS "Users can read their own notification logs" ON notification_log;
CREATE POLICY "Users can read their own notification logs" ON notification_log
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = customer_id);
