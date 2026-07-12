-- Alter profiles table to make is_business_mode default to true
ALTER TABLE public.profiles ALTER COLUMN is_business_mode SET DEFAULT true;

-- Update existing profiles that have not set a preference yet
UPDATE public.profiles SET is_business_mode = true WHERE is_business_mode IS NULL;
