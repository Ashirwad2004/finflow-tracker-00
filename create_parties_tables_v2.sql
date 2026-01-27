-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('customer', 'vendor', 'both')),
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for parties
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own parties" ON parties;
CREATE POLICY "Users can view own parties" ON parties FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own parties" ON parties;
CREATE POLICY "Users can insert own parties" ON parties FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own parties" ON parties;
CREATE POLICY "Users can update own parties" ON parties FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own parties" ON parties;
CREATE POLICY "Users can delete own parties" ON parties FOR DELETE USING (auth.uid() = user_id);


-- Create sales table if not exists (Essential for Sales Feature)
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    invoice_number TEXT,
    customer_name TEXT, -- Legacy/Display name
    customer_phone TEXT,
    customer_email TEXT,
    date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending', -- paid, pending, overdue
    payment_method TEXT DEFAULT 'cash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    party_id UUID REFERENCES parties(id) -- Link to party
);

-- Enable RLS for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sales" ON sales;
CREATE POLICY "Users can view own sales" ON sales FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sales" ON sales;
CREATE POLICY "Users can insert own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sales" ON sales;
CREATE POLICY "Users can update own sales" ON sales FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sales" ON sales;
CREATE POLICY "Users can delete own sales" ON sales FOR DELETE USING (auth.uid() = user_id);


-- Create purchases table if not exists (Essential for Purchases Feature)
CREATE TABLE IF NOT EXISTS purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    bill_number TEXT,
    vendor_name TEXT, -- Legacy/Display name
    date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    party_id UUID REFERENCES parties(id) -- Link to party
);

-- Enable RLS for purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own purchases" ON purchases;
CREATE POLICY "Users can insert own purchases" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own purchases" ON purchases;
CREATE POLICY "Users can update own purchases" ON purchases FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own purchases" ON purchases;
CREATE POLICY "Users can delete own purchases" ON purchases FOR DELETE USING (auth.uid() = user_id);
