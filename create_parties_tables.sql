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

-- Enable RLS
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own parties" ON parties;
CREATE POLICY "Users can view own parties" ON parties
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own parties" ON parties;
CREATE POLICY "Users can insert own parties" ON parties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own parties" ON parties;
CREATE POLICY "Users can update own parties" ON parties
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own parties" ON parties;
CREATE POLICY "Users can delete own parties" ON parties
    FOR DELETE USING (auth.uid() = user_id);

-- Add party_id to sales and purchases
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'party_id') THEN
        ALTER TABLE sales ADD COLUMN party_id UUID REFERENCES parties(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'party_id') THEN
        ALTER TABLE purchases ADD COLUMN party_id UUID REFERENCES parties(id);
    END IF;
END $$;
