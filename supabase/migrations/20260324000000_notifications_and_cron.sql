-- Migration: Notifications and Overdue Cron Job
-- Description: Creates a generic notifications table and a scheduled background job to scan lent_money and borrowed_money for overdue items.

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'overdue_lent', 'overdue_borrowed'
    is_read BOOLEAN DEFAULT false,
    reference_id UUID, -- References the specific loan/debt ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Note: user_id must match the type returned by auth.users(id). 
-- Added reference_id to ensure we don't spam notifications for the same item.

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Create the generator function matching lent_money and borrowed_money
CREATE OR REPLACE FUNCTION public.generate_overdue_notifications()
RETURNS void AS $$
DECLARE
    lent_record RECORD;
    borrowed_record RECORD;
BEGIN
    -- Process overdue lent_money
    FOR lent_record IN 
        SELECT id, user_id, person_name, amount, due_date
        FROM public.lent_money
        WHERE status = 'pending' 
          AND due_date IS NOT NULL 
          AND due_date < CURRENT_DATE
    LOOP
        -- Check if an active 'overdue_lent' notification already exists for this lent_money record
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE reference_id = lent_record.id AND type = 'overdue_lent' AND is_read = false
        ) THEN
            INSERT INTO public.notifications (user_id, message, type, reference_id)
            VALUES (
                lent_record.user_id,
                'Reminder: ₹' || lent_record.amount::numeric(10,2) || ' you lent to ' || lent_record.person_name || ' is overdue.',
                'overdue_lent',
                lent_record.id
            );
        END IF;
    END LOOP;

    -- Process overdue borrowed_money
    FOR borrowed_record IN 
        SELECT id, user_id, person_name, amount, due_date
        FROM public.borrowed_money
        WHERE status = 'pending' 
          AND due_date IS NOT NULL 
          AND due_date < CURRENT_DATE
    LOOP
        -- Check if an active 'overdue_borrowed' notification already exists for this borrowed_money record
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE reference_id = borrowed_record.id AND type = 'overdue_borrowed' AND is_read = false
        ) THEN
            INSERT INTO public.notifications (user_id, message, type, reference_id)
            VALUES (
                borrowed_record.user_id,
                'Reminder: ₹' || borrowed_record.amount::numeric(10,2) || ' you borrowed from ' || borrowed_record.person_name || ' is overdue.',
                'overdue_borrowed',
                borrowed_record.id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (Optional) Setup pg_cron to automation task 
-- Note: 'pg_cron' extension must be enabled on the Supabase project.
-- To enable this, uncomment the lines below and run in the Supabase SQL editor:

/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'generate-overdue-notifications-daily',
    '0 10 * * *', -- Run every day at 10:00 AM UTC
    $$ SELECT public.generate_overdue_notifications(); $$
);
*/
