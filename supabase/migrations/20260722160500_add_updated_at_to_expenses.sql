-- Migration: Add updated_at column to expenses table for offline sync conflict resolution
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Create trigger to automatically update updated_at timestamp on edit
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
