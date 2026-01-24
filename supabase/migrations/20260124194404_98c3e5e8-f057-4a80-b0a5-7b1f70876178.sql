-- Add split_data column to group_expenses table for tracking expense splits
ALTER TABLE public.group_expenses 
ADD COLUMN IF NOT EXISTS split_data jsonb DEFAULT NULL;