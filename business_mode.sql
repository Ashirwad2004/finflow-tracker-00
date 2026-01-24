-- Add Business Mode flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_business_mode BOOLEAN DEFAULT FALSE;

-- Add Business columns to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT FALSE;

-- Upsert Business Categories (Global)
-- Assuming 'uuid_generate_v4()' is available for IDs if needed, but normally Supabase handles default.
-- We check for existence by name to avoid duplicates.

INSERT INTO categories (name, color, icon)
SELECT 'Marketing', '#F97316', 'Megaphone'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Marketing');

INSERT INTO categories (name, color, icon)
SELECT 'Office Supplies', '#10B981', 'Paperclip'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Office Supplies');

INSERT INTO categories (name, color, icon)
SELECT 'Software', '#3B82F6', 'Laptop'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Software');

INSERT INTO categories (name, color, icon)
SELECT 'Travel', '#EC4899', 'Plane'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Travel');
