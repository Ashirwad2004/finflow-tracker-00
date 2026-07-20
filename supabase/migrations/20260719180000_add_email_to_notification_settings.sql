-- Add email column to notification_settings table
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
