-- Add split_data column to group_expenses table to support party-wise tracking
-- contents of update_schema_splits.sql

ALTER TABLE public.group_expenses 
ADD COLUMN IF NOT EXISTS split_data JSONB DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN public.group_expenses.split_data IS 'Array of user_ids involved in the split. If NULL, implies equal split among ALL group members.';

-- Example structure of split_data:
-- ["uuid-1", "uuid-2"]  -> Expense split equally between these two users only.
