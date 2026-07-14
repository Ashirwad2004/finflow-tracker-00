-- Migration: Add bank details columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_no text,
ADD COLUMN IF NOT EXISTS bank_ifsc text,
ADD COLUMN IF NOT EXISTS bank_branch text;

COMMENT ON COLUMN profiles.bank_name IS 'Company bank name for invoice printing';
COMMENT ON COLUMN profiles.bank_account_no IS 'Company bank account number for invoice printing';
COMMENT ON COLUMN profiles.bank_ifsc IS 'Company bank IFSC routing code for invoice printing';
COMMENT ON COLUMN profiles.bank_branch IS 'Company bank branch name for invoice printing';